if (typeof jQuery != 'undefined') {

/* ---------------------- */
/* generic functions */

function supportsLocalStorage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch(e){
		return false;
	}
}

function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;
	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

function pad(num, size) {
	var s = "000000000" + num;
	return s.substr(s.length-size);
}

function timeStamp() {
	var now = new Date();
	var date = [ now.getFullYear(), now.getMonth() + 1, now.getDate() ];
	var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];
	return date[0] + '-' + pad(date[1],2) + '-' + pad(date[2],2) + ' ' + pad(time[0],2) + ':' + pad(time[1],2) + ':' + pad(time[2],2);
}

function selectText(element) {
	var doc = document
		, text = doc.getElementById(element)
		, range, selection
	;
	if (doc.body.createTextRange) { //ms
		range = doc.body.createTextRange();
		range.moveToElementText(text);
		range.select();
	} else if (window.getSelection) { //all others
		selection = window.getSelection();
		range = doc.createRange();
		range.selectNodeContents(text);
		selection.removeAllRanges();
		selection.addRange(range);
	}
}

function rollDie(size) {
	if(typeof(size)==='undefined') size = 6;
	return roll = Math.floor(Math.random() * size)+1;
}

function uniqueName(desiredName, otherNames) {
	if (otherNames.indexOf(desiredName) > -1) {
		var newName = desiredName;
		var matches = desiredName.match('^(.*) ([0-9]*)$');
		if (matches) {
			var nextInt = parseInt(matches[2]);
			nextInt++;
			newName = matches[1] + ' ' + nextInt;
		} else {
			newName = desiredName + " 2";
		}
		newName = uniqueName(newName, otherNames);
		return newName;
	} else {
		return desiredName;
	}
}

function buildNameArray(targetArray, nameProperty) {
	if(typeof(nameProperty)==='undefined') nameProperty = 'name';
	var nameArray = [];
	for (var i in targetArray) {
		nameArray.push(targetArray[i][nameProperty]);
	}
	return nameArray;
}
/* ---------------------- */
/* models; properties and methods */

function teamModel() { // simplified company model for gameplay
	this.name = 'Unnamed Team';
	this.color = '#880000';
	this.sSystems = 20;

	this.gFrames = 5;
	this.gStations = 0;
	this.gPPA = 0;
	this.gScore = 0;

	this.cProfile = false; // completed frame profile for tracking 20+
	this.cFrames = [];
	this.cNonstandard = false;
};

function gameModel() {
	this.doomsday = 0;
	this.round = 0;
	this.gameType = 'Battle';
	this.log = '';
	this.inProgress = false;
	this.gameEnded = false;
	this.maxFrames = 0;
	this.minFrames = 0;
	this.stationsPerPlayer = 0;
	this.unclaimedStations = 0;
	this.teams = [];
	this.trackingLevel = 10;
};

gameModel.prototype = {
	roundsRemaining: function() {
		if (!this.doomsday) {
			return this.round;
		}
		var maxRounds = this.round + this.doomsday - 1;
		var minRounds = this.round + Math.ceil((this.doomsday) / (this.teams.length+1))-1;
		if (maxRounds <= this.round) {
			return maxRounds;
		} else if (minRounds == maxRounds) {
			return maxRounds;
		} else {
			return minRounds + '&#8211;' + maxRounds;
		}
	},
	sortByScore: function() {
		this.teams.sort(function(a,b) {
			return b.gScore - a.gScore;
		});
	},
	updateParameters: function() {
		this.stationsPerPlayer = NUMSTATIONS[this.teams.length];

		if (this.gameType == 'Battle') { // Skirmish
			this.maxFrames = MAXBTFRAMES[this.teams.length];
			this.minFrames = MINBTFRAMES[this.teams.length];
		} else if (this.gameType == 'Skirmish') { // Skirmish
			this.maxFrames = MAXSKFRAMES[this.teams.length];
			this.minFrames = MINSKFRAMES[this.teams.length];
		} else { // demo/free
			this.maxFrames = MAXFRAMES;
			this.minFrames = 1;
		}
	},
	updateScores: function() {
		for (var i in this.teams) {
			this.teams[i].gScore = (this.teams[i].gFrames + this.teams[i].gStations) * this.teams[i].gPPA;
		}
	},
	frameCountIsGood: function() {
		for (var i in this.teams) {
			if (this.teams[i].gFrames > this.maxFrames
			|| this.teams[i].gFrames < this.minFrames) {
				return false;
			}
		}
		return true;
	},
	tiedForDefense: function() {
		shuffle(this.teams); // randomize team order first...
		this.sortByScore(); // then sorting by score...
		mfzch.updateTeamList(this); // effectively randomly decides initaitive ties

		if (this.teams[1].gScore == this.teams[0].gScore) {
			var tiedForDef = 0;
			for (var i in this.teams) {
				if (this.teams[i].gScore == this.teams[0].gScore) {
					tiedForDef++;
				}
			}

			$('#def-tie-list').empty();

			for (var i = 0; i < tiedForDef; i++) {
				$('#def-tie-list').append('<li>' + mfzch.getIcon('company', this.teams[i].color, 'game-icon') + this.teams[i].name + '</li>')
			}

			$('.team-dupe-winner').html(mfzch.getIcon('company', this.teams[0].color, 'game-icon') + this.teams[0].name);

			return true;
		} else {
			return false;
		}
	},
	setPPA: function() {
		var teamsCopy = this.teams.slice(0);

		for (var i in teamsCopy) {
			teamsCopy[i].gPPA = 5; // reset all PPA
			teamsCopy[i].order = parseInt(i); // save original team order
		}


		// Sort teams by number of frames. Adjust accordingly
		teamsCopy.sort(function(a,b) {
			return b.gFrames - a.gFrames;
		});
		for (var i in teamsCopy) {
			if (teamsCopy[i].gFrames == teamsCopy[0].gFrames) {
				teamsCopy[i].gPPA--;
			}
			if (teamsCopy[i].gFrames == teamsCopy[teamsCopy.length - 1].gFrames) {
				teamsCopy[i].gPPA++;
			}
		}

		// Sort teams by number of systems. Adjust accordingly
		teamsCopy.sort(function(a,b) {
			return b.sSystems - a.sSystems;
		});
		for (var i in teamsCopy) {
			if (teamsCopy[i].sSystems == teamsCopy[0].sSystems) {
				teamsCopy[i].gPPA--;
			}
			if (teamsCopy[i].sSystems == teamsCopy[teamsCopy.length - 1].sSystems) {
				teamsCopy[i].gPPA++;
			}
		}

		// reorder to original list
		teamsCopy.sort(function(a,b) {
			return a.order - b.order;
		});

		// save PPA back to teams
		for (var i in teamsCopy) {
			this.teams[i].gPPA = teamsCopy[i].gPPA;
		}
	},
	reset: function() { // clean game before starting
		for (var i in this.teams) {
			// reset number of stations
			this.teams[i].gStations = this.stationsPerPlayer;
		}

		this.setPPA();
		this.updateScores();
		mfzch.updateTeamList(mfzch.game);

		// reset game parameters
		this.unclaimedStations = 0;
		this.inProgress = false;
		this.gameEnded = false;
		this.doomsday = 11;
		this.round = 1;
		this.log = '';

		mfzch.undo.states = [];
		mfzch.undo.currentState = 0;
		mfzch.undo.validStates = 0;

		mfzch.saveData(this, 'mfz.game');

		mfzch.settings.gameEndedOnce = false;
		mfzch.saveData(mfzch.settings, 'mfz.settings');
	},
	checkUnclaimedIsPossible: function () {
		if (this.teams.length < 3) {
			return false;
		}
		if (!this.teams[2].gScore) {
			return false;
		}
		var teamsWithFrames = 0;
		for (var i in this.teams) {
			if (this.teams[i].gFrames) {
				teamsWithFrames++;
			}
		}
		if (teamsWithFrames < 3) {
			return false;
		}
		return true;
	},
	checkOtherFrames: function(teamid) {
		for (var i in this.teams) {
			if (i != teamid && this.teams[i].gFrames) {
				return true;
			}
		}
		return false;
	},
	checkCapturableStations: function(teamid) {
		if (!this.teams[teamid].gFrames) {
			return false;
		}
		for (var i in this.teams) {
			if (i != teamid && this.teams[i].gStations) {
				return true;
			}
		}
		if(this.unclaimedStations) {
			return true;
		}
		return false;
	},
	checkDroppableStations: function(teamid) {
		if (!this.teams[teamid].gStations) {
			return false;
		}
		for (var i in this.teams) {
			if (i != teamid && this.teams[i].gFrames) {
				return true;
			}
		}
		return false;
	},
	getActions: function(teamid) {
		var actions = [];

		// frame loss
		if (this.trackingLevel < 20) {
			if (this.teams[teamid].gFrames && this.checkOtherFrames(teamid)) {
				actions.push('frame');
			}
		}
		// station gain
		if (this.checkCapturableStations(teamid)) {
			actions.push('station-capture');
		}
		// station loss
		if (this.checkDroppableStations(teamid)) {
			actions.push('station-drop');
		}

		return actions;
	},
	checkEarlyDoomsday: function() {
		if (!this.teams[1].gScore) {
			this.endGame();
		}
	},
	endGame: function() {
		if (!mfzch.settings.gameEndedOnce) { // only log to settings and track data once
			mfzch.settings.gamesPlayed++;
			try {
				ga('send', 'event', 'Game', 'Action', 'End', 1, false);
				ga('send', 'event', 'Game End', 'Rounds', this.round, this.round, false);
				ga('send', 'event', 'Game End', 'Final Score', this.logScores('analytics'), 0, false);
				ga('send', 'event', 'Game End', 'Winner Score', this.teams[0].gScore, this.teams[0].gScore, false);
				ga('send', 'event', 'Game End', 'Winner PPA', this.teams[0].gPPA, this.teams[0].gPPA, false);
				ga('send', 'event', 'Game End', 'Players', this.teams.length, this.teams.length, true);
				ga('send', 'event', 'Game End', 'Type', this.gameType, 0, true);
				ga('send', 'event', 'Game End', 'Track Level', this.trackingLevel, 0, false);
			} catch (err) {}
			mfzch.settings.gameEndedOnce = true;
			mfzch.saveData(mfzch.settings, 'mfz.settings');
		}
		this.gameEnded = true;
		this.logEvent('Game over');
		this.logScores();
		mfzch.updateGameInfo(this);

		var finalScore = '';
		for (var i in this.teams) {
			finalScore += '<li>' + mfzch.getIcon('company', this.teams[i].color, 'game-icon') + this.teams[i].gScore + ' - ' + this.teams[i].name + '</li>';
		}
		$('#final-score').html(finalScore);
		$('#final-score').listview('refresh');

		$('#game-end').popup('open');
		$('#end-round').hide();
		mfzch.saveData(this, 'mfz.game');
	},
	logEvent: function(eventText) {
		this.log += timeStamp() + ' - ' + eventText + '\n';
	},
	logSeparator: function(style) {
		if (style == 1) {
			this.log += '-------------\n';
		} else {
			this.log += '=============\n';
		}
	},
	logParameters: function(style) {
		this.log += 'Game Type: '+ this.gameType + '\n';
		this.log += 'Doomsday is '+ this.doomsday + '\n';
		this.logSeparator();
		this.logEvent('Round 1 begins');
	},
	logScores: function(style) {
		if (style == 'short') {
			for (var i in this.teams) {
				if( parseInt(i) ) {
					this.log += ' / ';
				} else {
					this.log += ' - ';
				}
				this.log += this.teams[i].name + ': ' + this.teams[i].gScore;
			}
			this.log += '\n';
		} else if (style == 'analytics') {
			var scoreStr = '';
			for (var i in this.teams) {
				if( parseInt(i) ) {
					scoreStr += ' / ';
				}
				scoreStr += this.teams[i].gScore + ' (' + this.teams[i].gFrames +'f+'+ this.teams[i].gStations + 's x' + this.teams[i].gPPA + ')';
			}
			return scoreStr;
		} else {
			this.logSeparator(1);
			this.log += '**Scores**\n';
			for (var i in this.teams) {
				this.log += this.teams[i].name + ': ' + this.teams[i].gScore + ' (' + this.teams[i].gFrames +'f+'+ this.teams[i].gStations + 's &#215; ' + this.teams[i].gPPA + ')'+ '\n';
			}
			this.logSeparator(1);
		}
	},
	restoreFromTemplate: function() {
		if(mfzch.templateGame) {
			mfzch.game = mfzch.JSONtoGameModel(mfzch.templateGame);
		} else {
			mfzch.game = new gameModel();
		}
	}
}

function companyModel() {
	this.name = 'Unnamed Company';
	this.color = '#880000';
	this.frames = [];
	this.nonstandard = false;
}

companyModel.prototype = {
	totalSystems: function(){
		var numSystems = 0;
		for (var i in this.frames) {
			numSystems += this.frames[i].totalSystems();
		}
		return numSystems;
	},
	totalSSRs: function(){
		var numSystems = 0;
		for (var i in this.frames) {
			numSystems += this.frames[i].ssr;
		}
		return numSystems;
	},
/*	getPlayerCounts: function(){
		var validPlayerCounts = [false, false, false, false, false, false];

		for (var i = 2; i < MAXTEAMS; i++) {
			if(this.frames.length >= MINSKFRAMES[i]
				|| this.frames.length >= MINBTFRAMES[i]) {
				validPlayerCounts[i] = true;
			}

			if(this.frames.length > MAXSKFRAMES[i]
				|| this.frames.length > MAXBTFRAMES[i]) {
				validPlayerCounts[i] = false;
			}
		}

		return validPlayerCounts;
	}, */
	calcCompanyStat: function() {
		var frameStats = [];
		for (var i in this.frames) {
			frameStats[i] = this.frames[i].calcFrameStat();
		}
		var companyStat = [];
		for (var i in frameStats) {
			for (var j in frameStats[i]) {
				if (!companyStat[j]) {
					companyStat[j] = [];
					companyStat[j]['label'] = '';
					companyStat[j]['hexcolor'] = '';
					companyStat[j]['d6'] = 0;
					companyStat[j]['d8'] = 0;
					companyStat[j]['multiplier'] = 0;
					companyStat[j]['max'] = 0;
					companyStat[j]['mean'] = 0;
					companyStat[j]['meanw1'] = 0;
					companyStat[j]['meanw2'] = 0;
					companyStat[j]['meanw2'] = 0;
				}
				for (var k in frameStats[i][j]) {
					if(k == 'd6'
						|| k == 'd8'
						|| k == 'max'
						|| k == 'mean'
						|| k == 'meanw1'
						|| k == 'meanw2') {
						companyStat[j][k] += frameStats[i][j][k];
					} else {
						companyStat[j][k] = frameStats[i][j][k];
					}
				}
			}
		}
		return companyStat;
	},
	getCompanyGraph: function(players){
		if(typeof(players)==='undefined') players = this.frames.length;

		var companyStat = this.calcCompanyStat();

		var output = '<table class="companygraph"><thead><tr><th class="stat-type"><span class="type-label">Type</span><a href="#graph-key-c" class="item-help">?</a></th><th class="stat-graph">Graph</th><th class="stat-std">Sys</th><th class="stat-white2">+W</th></tr></thead><tbody>';

		for(var i in companyStat) {
			output += '<tr>';
			output += '<td class="stat-type">' + companyStat[i].label + '</td>';

			output += '<td class="stat-graph graph-container">';

			var useColor = companyStat[i].hexcolor;
			var stdPct = Math.round(companyStat[i].mean / companyStat[i].max * 100);
			var w2Pct = Math.round(companyStat[i].meanw2 / companyStat[i].max * 100);

			output += '<span style="width:'+ w2Pct +'%; background:' + useColor + '" class="graphbar graphbar-2w"></span>';
			output += '<span style="width:'+ stdPct +'%; background:' + useColor + '" class="graphbar graphbar-sys"></span>';
			output += '</td>';

			output += '<td class="stat-std">' + companyStat[i].mean.toPrecision(3) + '</td>';
			output += '<td class="stat-white2">' +companyStat[i].meanw2.toPrecision(3) + '</td>';

			output += '</tr>';
		}

		output += '</tbody></table>';
		return output;
	}
}

function frameModel() {
	this.name = "Unnamed Frame"
	this.w = 2;
	this.rh = 0;
	this.rd = 0;
	this.ra = 0;
	this.b = 0;
	this.y = 0;
	this.g = 0;
	this.e = 0;
	this.ssr = 0;
	this.rhd = 0;
	this.rha = 0;
	this.rda = 0;

	this.activeRange = 'd';
	this.rollResult = false;

	this.activated = false;
	this.defense = 0;
	this.spot = 0;
}

frameModel.prototype = {
	totalSystems: function() {
		return n = this.rh + this.rd + this.ra + this.b + this.y + this.g + this.rhd + this.rha + this.rda + this.e; // ***
	},

	getSystemDisplay: function(useRange, showWhite, cssClass) {
		if(typeof(useRange) === 'undefined') useRange = false;
		if(typeof(showWhite) === 'undefined') showWhite = true;
		if(typeof(cssClass) === 'undefined') cssClass = '';

		var sysDisplay = '<ul class="sys-display ' + cssClass + '">';
		var isDisabled = '';

		if (showWhite) {
			for (var i = 0; i < this.w; i++) {
				sysDisplay += '<li data-sys="w">W</li>';
			}
		}

		if (useRange)
			isDisabled = (this.activeRange == "h") ? '' : ' class="disabled"';

		if (this.rh) {
			sysDisplay += '<li data-sys="rh"'+ isDisabled +'>Rh</li>';
		}
		if (this.rh == 2) {
			sysDisplay += '<li data-sys="rh"'+ isDisabled +'>Rh</li>';
		}

		if (useRange)
			isDisabled = (this.activeRange == "d") ? '' : ' class="disabled"';

		if (this.rd) {
			sysDisplay += '<li data-sys="rd"'+ isDisabled +'>Rd</li>';
		}
		if (this.rd == 2) {
			sysDisplay += '<li data-sys="rd"'+ isDisabled +'>Rd</li>';
		}

		if (useRange)
			isDisabled = (this.activeRange == "a") ? '' : ' class="disabled"';

		if (this.ra) {
			sysDisplay += '<li data-sys="ra"'+ isDisabled +'>Ra</li>';
		}
		if (this.ra == 2) {
			sysDisplay += '<li data-sys="ra"'+ isDisabled +'>Ra</li>';
		}

		if (useRange)
			var isDisabled = (this.activeRange == "a") ? ' class="disabled"' : '';

		for (var i = 0; i < this.rhd; i++) {
			sysDisplay += '<li data-sys="rhd"'+ isDisabled +'>Rh/d</li>';
		}

		if (useRange)
			isDisabled = (this.activeRange == "d") ? ' class="disabled"' : '';
		for (var i = 0; i < this.rha; i++) {
			sysDisplay += '<li data-sys="rha"'+ isDisabled +'>Rh/a</li>';
		}

		if (useRange)
			var isDisabled = (this.activeRange == "h") ? ' class="disabled"' : '';

		for (var i = 0; i < this.rda; i++) {
			sysDisplay += '<li data-sys="rda"'+ isDisabled +'>Rd/a</li>';
		}

		for (var i = 0; i < this.y; i++) {
			sysDisplay += '<li data-sys="y">Y</li>';
		}
		for (var i = 0; i < this.b; i++) {
			sysDisplay += '<li data-sys="b">B</li>';
		}
		for (var i = 0; i < this.g; i++) {
			sysDisplay += '<li data-sys="g">G</li>';
		}
		for (var i = 0; i < this.e; i++) { /* *** */
			sysDisplay += '<li data-sys="e">E</li>';
		}

		if (useRange)
			isDisabled = (this.activeRange == "d") ? '' : ' class="disabled"';

		for (var i = 0; i < this.ssr; i++) {
			sysDisplay += '<li data-sys="ssr"'+ isDisabled +'>SSR</li>';
		}

		sysDisplay += '</ul>';
		return sysDisplay;
	},
	getDiceDisplay: function(cssClass) {
		if(typeof(cssClass) === 'undefined') cssClass = '';
		var diceDisplay = '<ul class="dice-display ' + cssClass + '">';

		for (var i = 0; i < this.w; i++) {
			diceDisplay += '<li data-die="w6">W6</li>';
		}

		if (this.activeRange == "h") {
			if (this.rh) {
				diceDisplay += '<li data-die="r6">R6</li><li data-die="r6">R6</li>';
			}
			if (this.rh == 2) {
				diceDisplay += '<li data-die="r8">R8</li>';
			}
		}

		if (this.activeRange == "d") {
			if (this.rd) {
				diceDisplay += '<li data-die="r6">R6</li><li data-die="r6">R6</li>';
			}
			if (this.rd == 2) {
				diceDisplay += '<li data-die="r8">R8</li>';
			}
		}

		if (this.activeRange == "a") {
			if (this.ra) {
				diceDisplay += '<li data-die="r6">R6</li><li data-die="r6">R6</li>';
			}
			if (this.ra == 2) {
				diceDisplay += '<li data-die="r8">R8</li>';
			}
		}

		if (this.activeRange == "h" || this.activeRange == "d") {
			for (var i = 0; i < this.rhd; i++) {
				diceDisplay += '<li data-die="r6">R6</li>';
			}
		}
		if (this.activeRange == "h" || this.activeRange == "a") {
			for (var i = 0; i < this.rha; i++) {
				diceDisplay += '<li data-die="r6">R6</li>';
			}
		}
		if (this.activeRange == "d" || this.activeRange == "a") {
			for (var i = 0; i < this.rda; i++) {
				diceDisplay += '<li data-die="r6">R6</li>';
			}
		}

		if (this.activeRange == "d") {
			for (var i = 0; i < this.ssr; i++) {
				diceDisplay += '<li data-die="r8">R8</li>';
			}
		}

		for (var i = 0; i < this.y; i++) {
			diceDisplay += '<li data-die="y6">Y6</li>';
		}
		for (var i = 0; i < this.b; i++) {
			diceDisplay += '<li data-die="b6">B6</li>';
		}
		for (var i = 0; i < this.g; i++) {
			diceDisplay += '<li data-die="g6">G6</li>';
		}
		if (!this.rd && !this.ra && !this.rhd && !this.rha && !this.rda) {
			diceDisplay += '<li data-die="g8">G8</li>';
		}

		diceDisplay += '</ul>';
		return diceDisplay;
	},
	getRollDisplay: function(cssClass) {
		if(typeof(cssClass) === 'undefined') cssClass = '';
		return result = '<ul class="roll-display ' + cssClass + '">' + this.rollResult + '</ul>';
	},
	rollAll: function() {
		var result = '';

		for (var i = 0; i < this.w; i++) {
			result += '<li data-type="w" data-die="w6">W' + rollDie() + '</li>';
		}

		if (this.activeRange == "h") {
			if (this.rh) {
				result += '<li data-type="r" data-die="r6">R' + rollDie() + '</li>';
				result += '<li data-type="r" data-die="r6">R' + rollDie() + '</li>';
			}
			if (this.rh == 2) {
				result += '<li data-type="r" data-die="r8">R' + rollDie(8) + '</li>';
			}
		}

		if (this.activeRange == "d") {
			if (this.rd) {
				result += '<li data-type="r" data-die="r6">R' + rollDie() + '</li>';
				result += '<li data-type="r" data-die="r6">R' + rollDie() + '</li>';
			}
			if (this.rd == 2) {
				result += '<li data-type="r" data-die="r8">R' + rollDie(8) + '</li>';
			}
		}

		if (this.activeRange == "a") {
			if (this.ra) {
				result += '<li data-type="r" data-die="r6">R' + rollDie() + '</li>';
				result += '<li data-type="r" data-die="r6">R' + rollDie() + '</li>';
			}
			if (this.ra == 2) {
				result += '<li data-type="r" data-die="r8">R' + rollDie(8) + '</li>';
			}
		}

		if (this.activeRange == "h" || this.activeRange == "d") {
			for (var i = 0; i < this.rhd; i++) {
				result += '<li data-type="r" data-die="r6">R' + rollDie() + '</li>';
			}
		}
		if (this.activeRange == "h" || this.activeRange == "a") {
			for (var i = 0; i < this.rha; i++) {
				result += '<li data-type="r" data-die="r6">R' + rollDie() + '</li>';
			}
		}
		if (this.activeRange == "d" || this.activeRange == "a") {
			for (var i = 0; i < this.rda; i++) {
				result += '<li data-type="r" data-die="r6">R' + rollDie() + '</li>';
			}
		}

		if (this.activeRange == "d") {
			for (var i = 0; i < this.ssr; i++) {
				result += '<li data-type="r" data-die="r8">R' + rollDie(8) + '</li>';
			}
		}

		for (var i = 0; i < this.y; i++) {
			result += '<li data-type="y" data-die="y6">Y' + rollDie() + '</li>';
		}
		for (var i = 0; i < this.b; i++) {
			result += '<li data-type="b" data-die="b6">B' + rollDie() + '</li>';
		}
		for (var i = 0; i < this.g; i++) {
			result += '<li data-type="g" data-die="g6">G' + rollDie() + '</li>';
		}
		if (!this.rd && !this.ra && !this.rhd && !this.rha && !this.rda) {
			result += '<li data-type="g" data-die="g8">G' + rollDie(8) + '</li>';
		}

		return this.rollResult = result;
	},
	addSystem: function(sysType) {
		var tempRollResult = this.rollResult;
		this.rollResult = false;

		if (sysType == "w" && this[sysType] < 2) {
			this[sysType]++;
			return true;
		} else if (sysType == "ssr" && this[sysType] < 3) {
			this[sysType]++;
			return true;
		} else if (this.totalSystems() < 4 && this[sysType] < 2) {
			if (sysType == 'rhd') { // split system adding
				if (this.rh + this.rhd*0.5 + this.rha*0.5 < 2
					&& this.rd + this.rhd*0.5 + this.rda*0.5 < 2) {
					this[sysType]++;
					return true;
				}
			} else if (sysType == 'rha') {
				if (this.rh + this.rhd*0.5 + this.rha*0.5 < 2
					&& this.ra + this.rha*0.5 + this.rda*0.5 < 2) {
					this[sysType]++;
					return true;
				}
			} else if (sysType == 'rda') {
				if (this.rd + this.rhd*0.5 + this.rda*0.5 < 2
					&& this.ra + this.rha*0.5 + this.rda*0.5 < 2) {
					this[sysType]++;
					return true;
				}
			} else if (sysType == 'rh') {
				if (this.rh + this.rhd*0.5 + this.rha*0.5 <= 1) {
					this[sysType]++;
					return true;
				}
			} else if (sysType == 'rd') {
				if (this.rd + this.rhd*0.5 + this.rda*0.5 <= 1) {
					this[sysType]++;
					return true;
				}
			} else if (sysType == 'ra') {
				if (this.ra + this.rha*0.5 + this.rda*0.5 <= 1) {
					this[sysType]++;
					return true;
				}
			} else {
				this[sysType]++;
				return true;
			}
		}

		this.rollResult = tempRollResult;
		return false;
	},
	removeSystem: function(sysType){
		if (sysType == "w") {
			if (this[sysType] > 1) {
				this[sysType]--;
				this.rollResult = false;
				return true;
			}
		} else if (this[sysType]) {
			this[sysType]--;
			this.rollResult = false;
			return true;
		}
		return false;
	},
	calcFrameStat: function() {
		var frameStat = []

		// h2h
		frameStat.rh = [];
		frameStat.rh.label = '<span data-sys="rh">Rh</span>';
		frameStat.rh.hexcolor = '#E03B2C';
		frameStat.rh.d6 = 0;
		frameStat.rh.d8 = 0;
		frameStat.rh.multiplier = 0.5;
		frameStat.rh.max = 2.98;

		if (this.rh == 1) {
			frameStat.rh.d6 += 2;
		}
		if (this.rh == 2) {
			frameStat.rh.d6 += 2;
			frameStat.rh.d8++;
		}
		for(var i = 0; i < this.rhd; i++) {
			frameStat.rh.d6++;
		}
		for(var i = 0; i < this.rha; i++) {
			frameStat.rh.d6++;
		}
		frameStat.rh.mean = MEAND6D8[frameStat.rh.d6][frameStat.rh.d8] * frameStat.rh.multiplier;
		frameStat.rh.meanw1 = MEAND6D8[frameStat.rh.d6+1][frameStat.rh.d8] * frameStat.rh.multiplier;
		if (this.w > 1) {
			frameStat.rh.meanw2 = MEAND6D8[frameStat.rh.d6+2][frameStat.rh.d8] * frameStat.rh.multiplier;
		} else {
			frameStat.rh.meanw2 = 0;
		}

		// df
		frameStat.rd = [];
		frameStat.rd.label = '<span data-sys="rd">Rd</span>';
		frameStat.rd.hexcolor = '#E03B2C';
		frameStat.rd.d6 = 0;
		frameStat.rd.d8 = 0;
		frameStat.rd.multiplier = 0.3333;
		frameStat.rd.max = 2.98;
		if (mfzch.settings.altAttackGraphType) {
			frameStat.rd.max = 2.336;
		}

		if (this.rd == 1) {
			frameStat.rd.d6 += 2;
		}
		if (this.rd == 2) {
			frameStat.rd.d6 += 2;
			frameStat.rd.d8++;
		}
		for(var i = 0; i < this.rhd; i++) {
			frameStat.rd.d6++;
		}
		for(var i = 0; i < this.rda; i++) {
			frameStat.rd.d6++;
		}
		for(var i = 0; i < this.ssr; i++) {
			frameStat.rd.d8++;
		}
		if (frameStat.rd.d6 == 0 && frameStat.rd.d8 == 0) {
			frameStat.rd.disabled = true;
		}
		frameStat.rd.mean = MEAND6D8[frameStat.rd.d6][frameStat.rd.d8] * frameStat.rd.multiplier;
		if (!frameStat.rd.disabled) {
			frameStat.rd.meanw1 = MEAND6D8[frameStat.rd.d6+1][frameStat.rd.d8] * frameStat.rd.multiplier;
			if (this.w > 1) {
				frameStat.rd.meanw2 = MEAND6D8[frameStat.rd.d6+2][frameStat.rd.d8] * frameStat.rd.multiplier;
			} else {
				frameStat.rd.meanw2 = 0;
			}
		} else {
			frameStat.rd.meanw1 = 0;
			frameStat.rd.meanw2 = 0;
		}

		// arty
		frameStat.ra = [];
		frameStat.ra.label = '<span data-sys="ra">Ra</span>';
		frameStat.ra.hexcolor = '#E03B2C';
		frameStat.ra.d6 = 0;
		frameStat.ra.d8 = 0;
		frameStat.ra.multiplier = 0.3333;
		frameStat.ra.max = 2.98;
		if (mfzch.settings.altAttackGraphType) {
			frameStat.ra.max = 1.983;
		}
		if (this.ra == 1) {
			frameStat.ra.d6 += 2;
		}
		if (this.ra == 2) {
			frameStat.ra.d6 += 2;
			frameStat.ra.d8++;
		}
		for(var i = 0; i < this.rha; i++) {
			frameStat.ra.d6++;
		}
		for(var i = 0; i < this.rda; i++) {
			frameStat.ra.d6++;
		}
		if (frameStat.ra.d6 == 0 && frameStat.ra.d8 == 0) {
			frameStat.ra.disabled = true;
		}
		frameStat.ra.mean = MEAND6D8[frameStat.ra.d6][frameStat.ra.d8] * frameStat.ra.multiplier;

		if (!frameStat.ra.disabled) {
			frameStat.ra.meanw1 = MEAND6D8[frameStat.ra.d6+1][frameStat.ra.d8] * frameStat.ra.multiplier;
			if (this.w > 1) {
				frameStat.ra.meanw2 = MEAND6D8[frameStat.ra.d6+2][frameStat.ra.d8] * frameStat.ra.multiplier;
			} else {
				frameStat.ra.meanw2 = 0;
			}
		} else {
			frameStat.ra.meanw1 = 0;
			frameStat.ra.meanw2 = 0;
		}

		// spot
		frameStat.y = [];
		frameStat.y.label = '<span data-sys="y">Y</span>';
		frameStat.y.hexcolor = '#D3C250';
		frameStat.y.d6 = 0;
		frameStat.y.d8 = 0;
		frameStat.y.multiplier = 1;
		frameStat.y.max = 5.24;

		for(var i = 0; i < this.y; i++) {
			frameStat.y.d6++;
		}
		frameStat.y.mean = MEAND6D8[frameStat.y.d6][frameStat.y.d8] * frameStat.y.multiplier;
		frameStat.y.meanw1 = MEAND6D8[frameStat.y.d6+1][frameStat.y.d8] * frameStat.y.multiplier;
		if (this.w > 1) {
			frameStat.y.meanw2 = MEAND6D8[frameStat.y.d6+2][frameStat.y.d8] * frameStat.y.multiplier;
		} else {
			frameStat.y.meanw2 = 0;
		}

		// def
		frameStat.b = [];
		frameStat.b.label = '<span data-sys="b">B</span>';
		frameStat.b.hexcolor = '#0D4572';
		frameStat.b.d6 = 0;
		frameStat.b.d8 = 0;
		frameStat.b.multiplier = 1;
		frameStat.b.max = 5.24;

		for(var i = 0; i < this.b; i++) {
			frameStat.b.d6++;
		}

		frameStat.b.mean = MEAND6D8[frameStat.b.d6][frameStat.b.d8] * frameStat.b.multiplier;
		frameStat.b.meanw1 = MEAND6D8[frameStat.b.d6+1][frameStat.b.d8] * frameStat.b.multiplier;
		if (this.w > 1) {
			frameStat.b.meanw2 = MEAND6D8[frameStat.b.d6+2][frameStat.b.d8] * frameStat.b.multiplier;
		} else {
			frameStat.b.meanw2 = 0;
		}

		// move
		frameStat.g = [];
		frameStat.g.label = '<span data-sys="g">G</span>';
		frameStat.g.hexcolor = '#205A2E';
		frameStat.g.d6 = 0;
		frameStat.g.d8 = 0;
		frameStat.g.multiplier = 1;
		frameStat.g.max = 5.95;

		for(var i = 0; i < this.g; i++) {
			frameStat.g.d6++;
		}
		if (!this.rd && !this.ra && !this.rhd && !this.rha && !this.rda) {
			frameStat.g.d8++;
		}

		frameStat.g.mean = MEAND6D8[frameStat.g.d6][frameStat.g.d8] * frameStat.g.multiplier;
		frameStat.g.meanw1 = MEAND6D8[frameStat.g.d6+1][frameStat.g.d8] * frameStat.g.multiplier;
		if (this.w > 1) {
			frameStat.g.meanw2 = MEAND6D8[frameStat.g.d6+2][frameStat.g.d8] * frameStat.g.multiplier;
		} else {
			frameStat.g.meanw2 = 0;
		}

		// durability
		frameStat.dur = [];
		frameStat.dur.label = '<span data-sys="d">D</span>';
		frameStat.dur.hexcolor = '#f2f2f2';
		frameStat.dur.totalSystems = 0;
		frameStat.dur.multiplier = 0.3333;
		frameStat.dur.max = 5.6465;

		frameStat.dur.totalSystems = this.w;
		frameStat.dur.totalSystems += this.totalSystems();

		frameStat.dur.mean = frameStat.dur.totalSystems / ((8.46 - MEAND6D8[frameStat.b.d6][frameStat.b.d8]) * frameStat.dur.multiplier);
		frameStat.dur.meanw1 = frameStat.dur.totalSystems / ((8.46 - MEAND6D8[frameStat.b.d6 + 1][frameStat.b.d8]) * frameStat.dur.multiplier);
		if (this.w > 1) {
			frameStat.dur.meanw2 = frameStat.dur.totalSystems / ((8.46 - MEAND6D8[frameStat.b.d6 + 2][frameStat.b.d8]) * frameStat.dur.multiplier);
		} else {
			frameStat.dur.meanw2 = 0;
		}

/* ****** */
/*
		// efficiency
		frameStat.eff = [];
		frameStat.eff.label = '<span data-sys="d">Ef</span>';
		frameStat.eff.hexcolor = '#f2f2f2';
		frameStat.eff.multiplier = 1;
		frameStat.eff.max = 16.7;

		frameStat.eff.mean = Math.max(
			(frameStat.rh.mean / frameStat.rh.multiplier),
			(frameStat.rd.mean / frameStat.rd.multiplier),
			(frameStat.ra.mean / frameStat.ra.multiplier))
			+ frameStat.y.mean
			+ frameStat.b.mean
			+ frameStat.g.mean;

		frameStat.eff.meanw1 = 0;
		frameStat.eff.meanw2 = 0;
*/
		return frameStat;
	},
	createFrameGraph: function(useActiveRange) {
		var frameStat = this.calcFrameStat();

		var output = '<table class="framegraph"><thead><tr><th class="stat-type"><span class="type-label">Type</span><a href="#graph-key" class="item-help">?</a></th><th class="stat-graph">Graph</th><th class="stat-std">Sys</th><th class="stat-white1">+1W</th><th class="stat-white2">+2W</th></tr></thead><tbody>';

		for(var i in frameStat) {
			output += '<tr>';
			output += '<td class="stat-type">' + frameStat[i].label + '</td>';

			output += '<td class="stat-graph graph-container">';

			var useColor = frameStat[i].hexcolor;

			if (useActiveRange && (i == 'rh' || i == 'rd' || i == 'ra')) {
				if ((this.activeRange == 'h' && i != 'rh')
					|| (this.activeRange == 'd' && i != 'rd')
					|| (this.activeRange == 'a' && i != 'ra')) {
					useColor = '#aaa';
				}
			}

			var stdPct = Math.round(frameStat[i].mean / frameStat[i].max * 100);
			var w1Pct = Math.round(frameStat[i].meanw1 / frameStat[i].max * 100);
			var w2Pct = Math.round(frameStat[i].meanw2 / frameStat[i].max * 100);

			if (!frameStat[i].disabled) {
				if (this.w == 2) {
					output += '<span style="width:'+ w2Pct +'%; background:' + useColor + '" class="graphbar graphbar-2w"></span>';
				}

				output += '<span style="width:'+ w1Pct +'%; background:' + useColor + '" class="graphbar graphbar-1w"></span>';
			}

			output += '<span style="width:'+ stdPct +'%; background:' + useColor + '" class="graphbar graphbar-sys"></span>';
			output += '</td>';

			if (frameStat[i].disabled) {
				output += '<td class="stat-std">-</td>'
				output += '<td class="stat-white1">-</td>'
				output += '<td class="stat-white2">-</td>'
			} else {
				output += '<td class="stat-std">' + frameStat[i].mean.toFixed(2) + '</td>';
				output += '<td class="stat-white1">' + frameStat[i].meanw1.toFixed(2) + '</td>';
				if (this.w == 2) {
					output += '<td class="stat-white2">' +frameStat[i].meanw2.toFixed(2) + '</td>';
				} else {
					output += '<td class="stat-white2">-</td>'
				}
			}
			output += '</tr>';
		}

		output += '</tbody></table>';
		return output;
	}
}

function settingsModel() {
	// settable preferences
	this.enableSplitSystems = false;
	this.enableEnvironmental = false; // ***
	this.nonThematicNav = false;
	this.altAttackGraphType = false;
	this.compactUI = false;
	// settable preferences from outside main interface
	this.showUnitGraphs = false;
	this.showLoadoutGraph = true;
	// unsettable
	this.saveVersion = 3;
	this.buildVersion = 0;
	this.framesDestroyed = 0;
	this.systemsDestroyed = 0;
	this.gamesPlayed = 0;
	// app state
	this.gameEndedOnce = false;
}

/* ---------------------- */
/* mfz:ch generic functions */

var mfzch = {
	game: new gameModel(),
	templateGame: '',
	frameSet: [],
	companies: [],
	loadouts: [],
	settings: new settingsModel(),
	frameNow: 1,
	gameDataToGameModel: function (loadedData) {
		var restoredGame = new gameModel;
		for (var i in loadedData) {
			if(i == 'teams') {
				restoredGame[i] = [];
				for (var j in loadedData[i]) {
					restoredGame[i][j] = new teamModel;

					for (var k in loadedData[i][j]) {
						if (k == 'cFrames'
							&& loadedData[i][j]['cProfile']) {
							restoredGame[i][j][k] = [];
							for (var l in loadedData[i][j][k]) {
								restoredGame[i][j][k][l] = new frameModel();
								for (var m in loadedData[i][j][k][l]) {
									restoredGame[i][j][k][l][m] = loadedData[i][j][k][l][m];
								}
							}

						} else {
							restoredGame[i][j][k] = loadedData[i][j][k];
						}
					}
				}
			} else {
				restoredGame[i] = loadedData[i]
			}
		}
		return restoredGame;

	},
	JSONtoGameModel: function (loadJSON) {
		return restoredGame = this.gameDataToGameModel(JSON.parse(loadJSON));
	},

	/* Load and Save */

	saveData: function(data, location, storeRaw) {
		if (!supportsLocalStorage()) { return false; }
		if (storeRaw) {
			localStorage[location] = data;
		} else {
			localStorage[location] = JSON.stringify(data);
		}
		return 'done';
	},
	restoreData: function(location, dataType) {
		if (supportsLocalStorage() && localStorage[location]) {
			var loadedData = JSON.parse(localStorage[location]);

			if (dataType == 'game') {
				return restoredGame = mfzch.gameDataToGameModel(loadedData);
			} else if (dataType == 'templateGame') {
				return localStorage[location];
			} else if (dataType == 'sim') {
				var restoredSim = [];
				for (var i in loadedData) {
					restoredSim[i] = new frameModel;
					for (var j in loadedData[i]) {
						restoredSim[i][j] = loadedData[i][j];
					}
				}
				return restoredSim;
			} else if (dataType == 'companies') {
				var restoredCompanies = [];
				for (var i in loadedData) {
					restoredCompanies[i] = new companyModel;
					for (var j in loadedData[i]) {
						if(j == 'frames') {
							restoredCompanies[i][j] = [];
							for (var k in loadedData[i][j]) {
								restoredCompanies[i][j][k] = new frameModel;
								for (var l in loadedData[i][j][k]) {
									restoredCompanies[i][j][k][l] = loadedData[i][j][k][l];
								}
							}
						} else {
							restoredCompanies[i][j] = loadedData[i][j];
						}
					}
				}
				return restoredCompanies;
			} else if (dataType == 'loadouts') {
				var restoredLoadouts = [];
				for (var i in loadedData) {
					restoredLoadouts[i] = new frameModel;
					for (var j in loadedData[i]) {
						restoredLoadouts[i][j] = loadedData[i][j];
					}
				}
				return restoredLoadouts;
			} else if (dataType == 'settings') {
				var restoredSettings = new settingsModel();
				for (var i in loadedData) {
					restoredSettings[i] = loadedData[i];
				}
				return restoredSettings;
			} else {
				return false;
			}
		} else {
			if (dataType == 'game') {
				return new gameModel();
			} else if (dataType == 'templateGame') {
				return '';
			} else if (dataType == 'sim') {
				var protoSim = [];
				protoSim[1] = new frameModel();
				protoSim[2] = new frameModel();
				return protoSim;
			} else if (dataType == 'companies') {
				return [];
			} else if (dataType == 'loadouts') {
				return [];
			} else if (dataType == 'settings') {
				return new settingsModel();
			} else {
				return false;
			}
		}
	},

	/* undo/redo */

	undo: {
		states: [],
		currentState: 0,
		validStates: 0,

		setState: function() {
			this.currentState++;
			this.validStates = this.currentState;

			this.states[this.currentState] = JSON.stringify(mfzch.game);

			$('#undo').prop('disabled', false);
			$('#redo').prop('disabled', true);
		},
		getState: function() {
			if(this.currentState) {
				var redoState = this.currentState + 1;
				this.states[redoState] = JSON.stringify(mfzch.game);

				mfzch.game = this.restoreState(this.states[this.currentState]);
				this.currentState--;

				if (this.currentState < 1) {
					$('#undo').prop('disabled', true);
				}

				$('#redo').prop('disabled', false);
				$('#end-round').show();
			}
		},
		getRedoState: function() {
			if(this.currentState < this.validStates) {
				this.currentState++;
				var redoState = this.currentState + 1;

				mfzch.game = this.restoreState(this.states[redoState]);

				if(this.currentState >= this.validStates) {
					$('#redo').prop('disabled', true);
				}

				$('#undo').prop('disabled', false);
			} else {
				$('#redo').prop('disabled', true);
			}
		},
		restoreState: function(state) {
			return restoredGame = mfzch.JSONtoGameModel(state);
		},
		invalidateLastState: function() {
			this.currentState--;
			this.validStates = this.currentState;

			if (this.currentState < 1) {
				$('#undo').prop('disabled', true);
			}

			$('#redo').prop('disabled', true);
		}
	},

	/* interface */

	buildNav: function() {
		var nav = '<ul data-role="listview" data-inset="true" class="nav-listview">'
		+ '<li><a href="#team_setup">Asset Tracking</a></li>'
		+ '<li><a href="#dice-roller">System Simulation</a></li>'
		+ '<li><a href="#rules-reference">Rules of Engagement</a></li>'
		+ '<li><a href="#loadouts">Loadout Archetypes</a></li>'
		+ '<li><a href="#company-analysis">Structured Units</a></li>'
		+ '</ul>';

		if (this.settings.nonThematicNav) {
			nav = '<ul data-role="listview" data-inset="true" class="nav-listview">'
			+ '<li><a href="#team_setup">Play Game</a></li>'
			+ '<li><a href="#dice-roller">Dice Roller</a></li>'
			+ '<li><a href="#rules-reference">Rules Reference</a></li>'
			+ '<li><a href="#loadouts">Loadouts</a></li>'
			+ '<li><a href="#company-analysis">Companies</a></li>'
			+ '</ul>';
		}

		return nav;
	},
	buildNavPanel: function() {
		return navPanel = '<div data-role="panel" id="nav-panel" data-theme="c" data-position="left" data-position-fixed="true" data-display="reveal">'
		+ '<h2><a href="#main-page">MFZ:RA Commander&#8217;s Handbook</a></h2>'
		+ this.buildNav() + '</div>';
	},
	getIcon: function(iconType, color, cssClass) {
		if(typeof(iconType)==='undefined') iconType = 'frame';
		if(typeof(color)==='undefined') {
			color = '#ffffff';
			strokeColor = "#000000"
		} else {
			hex = color.replace(/[^0-9A-F]/gi, '');
			var bigint = parseInt(hex, 16);
			var r = (bigint >> 16) & 255;
			var g = (bigint >> 8) & 255;
			var b = bigint & 255;

			var brightness = ((r * 299) + (g * 587) + (b * 114)) / 255000;

			// values range from 0 to 1
			// anything greater than 0.5 should be bright enough for dark text
			if (brightness >= 0.1) {
				strokeColor = "#000000"
			} else {
				strokeColor = "#999"
			}
		}
		if(typeof(cssClass) === 'undefined') cssClass = '';

		if (iconType == 'frame') {
			return svg = '<svg class="frame-icon ' + cssClass + '" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="1.5em" height="1.5em" viewBox="0 0 64 64" enable-background="new 0 0 64 64" xml:space="preserve"> <path fill="' + color + '" d="M42.209,7.57c-0.72,0-1.443,0.069-2.105,0.245c-3.167,0.836-4.374,2.006-4.469,2.082 	c-0.686,0.546-0.585,1.003-0.41,2.153c0.067,0.441,0.188,1.212,0.308,1.433c0.165,0.305,0.718,0.411,0.718,0.411l0.306,0.819 	c0.297,0.128,0.815,0.162,1.266,0.162c0.459,0,0.846-0.034,0.846-0.034l0.106,0.266l-0.869,0.318l-0.187-0.043l-0.813,0.285 	l-3.182-0.785l-3.726,2.804l1.026,4.306l1.434,0.82c0,0-0.1,0.396-0.206,0.818c-0.105,0.423-0.203,0.923-0.203,0.923l-1.332-1.639 	l-3.076-0.822L26,23.731l0.41,0.515l-0.102,0.308c0.007,0.027,0.205,0.308,0.205,0.308l-1.332,0.307c0,0-1.47-0.429-1.744-0.513 	c-0.322-0.099-0.472-0.333-0.814-0.333c-0.063,0-0.132,0.008-0.21,0.026c-0.115,0.027-0.335,0.204-0.512,0.409 	c-0.073,0.087-0.033,0.21-0.104,0.309c-0.208,0.3-2.783,2.955-2.97,3.074c-0.018,0.004-0.038,0.006-0.062,0.006 	c-0.292,0-1.028-0.288-2.028-0.288c-1.041,0-2.367,0.312-3.777,1.583c-2.207,1.989-2.873,4.939-2.332,6.179 	c0.093,0.215,0.381,0.572,0.381,0.572l-0.751,0.767l0.062,0.302c0,0-0.293,0.225-0.308,0.308c-0.047,0.286,0.103,0.719,0.103,0.719 	l-2.532,2.28c0,0-0.189,0.305-0.101,0.66c0.061,0.244,0.24,0.506,0.24,0.506L7,42.355c0,0-0.368,0.583,0.862,1.977 	c0.805,0.914,1.346,1.071,1.623,1.071c0.146,0,0.219-0.044,0.219-0.044l0.717-0.52c0,0,0.293,0.209,0.506,0.265 	c0.115,0.029,0.218,0.04,0.308,0.04c0.175,0,0.289-0.04,0.289-0.04l4.329-3.64l0.104-0.514l0.308-0.409h0.718l1.765-1.26 	c0,0,0.155,0.235,0.298,0.304c0.198,0.093,0.347,0.117,0.449,0.117c0.105,0,0.159-0.025,0.159-0.025l0.915-0.57 	c0,0,0.164,0.025,0.316,0.025c0.076,0,0.149-0.006,0.197-0.025c0.026-0.011,2.08-1.879,2.08-1.879l0.073-0.582 	c0,0,0.304-0.297,0.41-0.308h0.004c0.095,0,0.355,0.354,0.815,0.411c0.015,0.001,0.029,0.002,0.043,0.002 	c0.255,0,0.418-0.284,0.418-0.284h0.329c0,0,0.332,0.677,0.645,0.794c0.212,0.08,0.407,0.115,0.586,0.115 	c0.805,0,1.287-0.682,1.464-0.935c0.037-0.005,0.072-0.008,0.105-0.008c0.25,0,0.393,0.146,0.612,0.212 	c0.307,0.097,0.719,0.308,0.719,0.308l-0.411,3.689l0.308,0.719c0,0-0.557,0.761-0.616,0.819c-0.006,0.007-0.017,0.01-0.031,0.01 	c-0.04,0-0.103-0.019-0.143-0.019c-0.015,0-0.026,0.003-0.031,0.009c-0.056,0.083-1.138,1.146-1.363,3.355 	c-0.225,2.206,0.253,3.225,0.34,3.409c0.139,0.301,0.256,0.629,0.41,0.819l0.037,0.359l-0.84,1.604l0.161,4.261l4.409,0.821 	l7.098-1.409l0.045-4.33c0,0,0.307-0.905,0.365-0.999c0.11-0.183,1.064-1.682,1.148-3.351c0.132-2.623-0.793-4.048-0.943-4.233 	c-0.112-0.138-0.391-0.5-0.391-0.5l0.463-0.31l0.646-5.135l-0.515-0.718l0.829,0.121l0.196,1.107l1.128,0.105l0.818,5.122 	l0.616,0.412c0,0-0.547,0.375-0.78,1.454s-0.207,1.862-0.246,2.029c-0.043,0.206-0.237,0.249-0.305,0.409 	c-0.071,0.166,0.004,1.849,0.043,2.226c0.039,0.378,0.469,0.952,0.469,0.952c0.143,0.324,0.238,0.782,0.409,1.231 	c0.28,0.725,0.682,1.23,0.682,1.23l0.861,0.573l0.357,5.44l6.764-0.098l3.801-2.466c0,0-0.058-2.275-0.063-2.528 	c0,0-0.087-0.194-0.102-0.308c-0.05-0.377-0.326-1.477-0.308-1.948c0.006-0.177,0.143-0.447,0.205-0.719 	c0.067-0.309,0.033-0.774,0.103-0.923c0.083-0.176,0.436-0.343,0.51-0.409c0.201-0.163,0.584-0.925,0.46-2.089 	c-0.093-0.845-0.558-1.699-0.562-1.703c-0.151-0.158-0.643-0.173-0.716-0.411c-0.549-1.787-1.641-3.175-1.641-3.175l-0.356-3.459 	c0,0,1.282-0.437,1.278-0.437c0.267,0.02,0.257,0.326,0.41,0.411c0.159,0.086,0.313,0.118,0.456,0.118 	c0.284,0,0.522-0.13,0.67-0.222l0.618-1.23c0,0,0.624-0.195,0.818-0.308c0.657-0.378,0.821-0.922,0.821-0.922v-1.538l-0.207-0.613 	l0.514-1.846v-9.837c0,0-1.22-1.745-1.229-1.745v0c-0.018-0.132,0.158-1.627,0.204-2.254c0.059-0.763,0.092-1.432,0.092-1.432 	l-3.679-4.103c0,0-2.8,1.335-2.974,1.433c-0.038,0.025-0.102,0.207-0.102,0.207l-0.308,0.103l-0.41,0.308l-1.127,0.205l-0.924-0.513 	l-0.92,0.102l-0.614-0.205l-1.304,0.109l-0.066-0.134c0,0,1.957-0.625,2.271-1.148l-0.08-0.441c0,0,0.239-0.14,0.305-0.23 	c0.06-0.083,0.082-0.268,0.082-0.511c-0.002-0.934-0.356-2.719-0.39-2.769C46.721,8.267,44.48,7.57,42.209,7.57"/> <path fill="' + strokeColor + '" fill="#000000" d="M42.209,7.57c2.271,0,4.512,0.697,4.699,0.994c0.033,0.049,0.388,1.835,0.39,2.769 	c0,0.244-0.022,0.429-0.082,0.511c-0.065,0.091-0.305,0.23-0.305,0.23l0.08,0.441c-0.314,0.523-2.271,1.148-2.271,1.148l0.066,0.134 	l1.304-0.109l0.614,0.205l0.92-0.102l0.924,0.513l1.127-0.205l0.41-0.308l0.308-0.103c0,0,0.063-0.181,0.102-0.207 	c0.174-0.098,2.974-1.433,2.974-1.433l3.679,4.103c0,0-0.033,0.668-0.092,1.432c-0.046,0.627-0.222,2.123-0.204,2.254v0 	c0.01,0,1.229,1.745,1.229,1.745v9.837l-0.514,1.846l0.207,0.613v1.538c0,0-0.164,0.544-0.821,0.922 	c-0.194,0.112-0.818,0.308-0.818,0.308l-0.618,1.23c-0.147,0.092-0.386,0.222-0.67,0.222c-0.144,0-0.297-0.032-0.456-0.118 	c-0.153-0.085-0.144-0.392-0.41-0.411c0.004,0-1.278,0.437-1.278,0.437l0.356,3.459c0,0,1.092,1.388,1.641,3.175 	c0.073,0.238,0.564,0.253,0.716,0.411c0.004,0.004,0.469,0.858,0.562,1.703c0.124,1.164-0.259,1.926-0.46,2.089 	c-0.074,0.066-0.427,0.233-0.51,0.409c-0.069,0.148-0.035,0.614-0.103,0.923c-0.063,0.271-0.199,0.542-0.205,0.719 	c-0.019,0.472,0.258,1.571,0.308,1.948c0.015,0.113,0.102,0.308,0.102,0.308c0.006,0.253,0.063,2.528,0.063,2.528l-3.801,2.466 	l-6.764,0.098l-0.357-5.44l-0.861-0.573c0,0-0.401-0.506-0.682-1.23c-0.171-0.449-0.267-0.907-0.409-1.231 	c0,0-0.43-0.574-0.469-0.952c-0.039-0.377-0.114-2.06-0.043-2.226c0.067-0.16,0.262-0.203,0.305-0.409 	c0.039-0.167,0.013-0.95,0.246-2.029s0.78-1.454,0.78-1.454L42.5,42.283l-0.818-5.122l-1.128-0.105l-0.196-1.107l-0.829-0.121 	l0.515,0.718l-0.646,5.135l-0.463,0.31c0,0,0.278,0.362,0.391,0.5c0.15,0.186,1.075,1.61,0.943,4.233 	c-0.084,1.669-1.038,3.168-1.148,3.351c-0.059,0.094-0.365,0.999-0.365,0.999l-0.045,4.33l-7.098,1.409l-4.409-0.821l-0.161-4.261 	l0.84-1.604l-0.037-0.359c-0.153-0.19-0.271-0.519-0.41-0.819c-0.087-0.185-0.564-1.203-0.34-3.409 	c0.225-2.209,1.307-3.272,1.363-3.355c0.005-0.006,0.017-0.009,0.031-0.009c0.04,0,0.103,0.019,0.143,0.019 	c0.014,0,0.025-0.003,0.031-0.01c0.059-0.059,0.616-0.819,0.616-0.819l-0.308-0.719l0.411-3.689c0,0-0.412-0.211-0.719-0.308 	c-0.219-0.066-0.361-0.212-0.612-0.212c-0.033,0-0.068,0.003-0.105,0.008c-0.177,0.253-0.659,0.935-1.464,0.935 	c-0.179,0-0.374-0.035-0.586-0.115c-0.313-0.117-0.645-0.794-0.645-0.794h-0.329c0,0-0.163,0.284-0.418,0.284 	c-0.014,0-0.029-0.001-0.043-0.002c-0.46-0.057-0.72-0.411-0.815-0.411h-0.004c-0.106,0.011-0.41,0.308-0.41,0.308l-0.073,0.582 	c0,0-2.054,1.868-2.08,1.879c-0.048,0.02-0.121,0.025-0.197,0.025c-0.152,0-0.316-0.025-0.316-0.025l-0.915,0.57 	c0,0-0.054,0.025-0.159,0.025c-0.102,0-0.251-0.024-0.449-0.117c-0.143-0.068-0.298-0.304-0.298-0.304l-1.765,1.26h-0.718 	l-0.308,0.409l-0.104,0.514l-4.329,3.64c0,0-0.113,0.04-0.289,0.04c-0.089,0-0.193-0.011-0.308-0.04 	c-0.213-0.056-0.506-0.265-0.506-0.265l-0.717,0.52c0,0-0.073,0.044-0.219,0.044c-0.277,0-0.818-0.157-1.623-1.071 	C6.633,42.938,7,42.355,7,42.355l0.722-0.621c0,0-0.179-0.262-0.24-0.506c-0.089-0.355,0.101-0.66,0.101-0.66l2.532-2.28 	c0,0-0.15-0.433-0.103-0.719c0.014-0.083,0.308-0.308,0.308-0.308l-0.062-0.302l0.751-0.767c0,0-0.289-0.357-0.381-0.572 	c-0.541-1.239,0.125-4.19,2.332-6.179c1.41-1.271,2.736-1.583,3.777-1.583c1,0,1.736,0.288,2.028,0.288 	c0.024,0,0.044-0.002,0.062-0.006c0.188-0.119,2.763-2.774,2.97-3.074c0.07-0.099,0.031-0.222,0.104-0.309 	c0.177-0.205,0.397-0.382,0.512-0.409c0.078-0.018,0.147-0.026,0.21-0.026c0.342,0,0.492,0.235,0.814,0.333 	c0.273,0.084,1.744,0.513,1.744,0.513l1.332-0.307c0,0-0.198-0.28-0.205-0.308l0.102-0.308L26,23.731l1.64-1.638l3.076,0.822 	l1.332,1.639c0,0,0.098-0.5,0.203-0.923c0.105-0.423,0.206-0.818,0.206-0.818l-1.434-0.82l-1.026-4.306l3.726-2.804l3.182,0.785 	l0.813-0.285l0.187,0.043l0.869-0.318l-0.106-0.266c0,0-0.387,0.034-0.846,0.034c-0.45,0-0.969-0.033-1.266-0.162l-0.306-0.819 	c0,0-0.553-0.106-0.718-0.411c-0.119-0.221-0.24-0.992-0.308-1.433c-0.175-1.149-0.275-1.607,0.41-2.153 	c0.095-0.075,1.302-1.246,4.469-2.082C40.766,7.64,41.489,7.57,42.209,7.57 M42.209,6.113L42.209,6.113 	c-0.907,0-1.741,0.099-2.478,0.293c-2.879,0.76-4.383,1.809-5.024,2.368l0.007-0.006C33.407,9.818,33.59,11,33.766,12.144 	l0.019,0.125c0.078,0.514,0.144,0.89,0.212,1.178L33.399,13.3l-0.553,0.417l-3.727,2.805l-0.762,0.573l0.221,0.929l0.715,3.003 	l-1.279-0.341l-0.812-0.216l-0.595,0.593l-1.64,1.638l-0.687,0.686c-0.159-0.047-0.295-0.087-0.376-0.112 	c-0.015-0.009-0.029-0.019-0.043-0.027c-0.22-0.134-0.629-0.383-1.241-0.383c-0.176,0-0.357,0.022-0.539,0.064 	c-0.553,0.129-1.005,0.549-1.288,0.879c-0.165,0.197-0.258,0.394-0.313,0.557c-0.42,0.464-1.5,1.586-2.133,2.219 	c-0.411-0.087-0.958-0.182-1.614-0.182c-1.713,0-3.312,0.659-4.752,1.958c-2.515,2.267-3.434,5.667-2.786,7.601l-0.524,0.534 	l0.071,0.347c-0.079,0.144-0.139,0.303-0.17,0.483c-0.023,0.139-0.031,0.278-0.028,0.414l-1.939,1.747l-0.153,0.138l-0.108,0.174 	c-0.107,0.173-0.416,0.743-0.333,1.484l-0.13,0.11l-0.117,0.187C5.482,42.031,5.009,43.3,6.77,45.296 	c0.915,1.038,1.829,1.564,2.716,1.564c0.353,0,0.696-0.089,0.966-0.25l0.056-0.033l0.052-0.039l0.024-0.018 	c0.211,0.054,0.431,0.081,0.651,0.081c0.369,0,0.643-0.077,0.772-0.123l0.25-0.087l0.203-0.173l4.33-3.64l0.39-0.328l0.051-0.252 	h0.218l0.379-0.271l0.955-0.682c0.24,0.075,0.477,0.114,0.709,0.114c0.362,0,0.629-0.093,0.791-0.17l0.071-0.033l0.066-0.043 	l0.521-0.324c0.253-0.005,0.476-0.048,0.678-0.13c0.271-0.108,0.271-0.108,2.521-2.153l0.123-0.113c0.009,0,0.016,0.002,0.023,0.003 	c0.069,0.009,0.144,0.013,0.218,0.013c0.071,0,0.141-0.004,0.208-0.012c0.194,0.182,0.417,0.334,0.67,0.429 	c0.364,0.138,0.734,0.207,1.099,0.207c0.358,0,0.797-0.066,1.257-0.292l-0.216,1.94l-0.042,0.383l0.074,0.174 	c-0.083,0.066-0.161,0.144-0.23,0.229c-0.938,1.085-1.514,2.506-1.679,4.122c-0.173,1.697-0.012,3.139,0.466,4.169 	c0.031,0.068,0.061,0.136,0.09,0.204c0.033,0.076,0.066,0.153,0.103,0.231l-0.555,1.061l-0.18,0.344l0.015,0.388l0.161,4.26 	l0.044,1.164l1.145,0.214l4.41,0.821l0.274,0.052l0.275-0.055l7.099-1.409l1.161-0.23l0.012-1.184l0.042-4.095 	c0.08-0.229,0.161-0.46,0.205-0.573c0.109-0.182,0.233-0.401,0.362-0.653c0.077,0.138,0.155,0.261,0.228,0.368 	c0.031,0.09,0.066,0.208,0.1,0.323c0.066,0.217,0.141,0.464,0.24,0.727c0.353,0.912,0.847,1.55,0.902,1.619l0.143,0.18l0.19,0.128 	l0.263,0.174l0.311,4.723l0.091,1.381l1.385-0.02l6.764-0.099l0.42-0.007l0.352-0.228l3.801-2.466l0.685-0.443l-0.021-0.816 	c0,0-0.059-2.267-0.063-2.519l-0.027-1.457l-0.272,0.004c-0.044-0.227-0.089-0.479-0.105-0.636c0.004-0.012,0.01-0.022,0.014-0.034 	c0.047-0.136,0.105-0.306,0.149-0.501c0.038-0.171,0.059-0.337,0.069-0.49c0.021-0.016,0.041-0.032,0.062-0.049 	c0.61-0.513,1.144-1.745,0.969-3.36c-0.122-1.138-0.698-2.23-0.843-2.422l-0.053-0.069l-0.061-0.064 	c-0.184-0.192-0.388-0.313-0.568-0.396c-0.455-1.219-1.08-2.214-1.432-2.721l-0.146-1.429c0.172,0.039,0.347,0.06,0.525,0.06 	c0.724,0,1.258-0.331,1.435-0.438l0.353-0.218l0.186-0.369l0.352-0.699c0.214-0.081,0.383-0.157,0.505-0.227 	c1.108-0.639,1.44-1.587,1.494-1.771l0.062-0.205v-0.213v-1.538V33.64l-0.076-0.227l-0.063-0.188l0.393-1.415l0.054-0.191v-0.199 	v-9.837v-0.459l-0.264-0.376l-0.611-0.875c-0.119-0.168-0.225-0.32-0.321-0.453c0.019-0.193,0.042-0.417,0.06-0.595 	c0.043-0.42,0.088-0.855,0.108-1.13c0.057-0.773,0.091-1.44,0.093-1.468l0.03-0.6l-0.4-0.448l-3.679-4.102l-0.728-0.812l-0.983,0.47 	c-1.89,0.9-2.921,1.398-3.065,1.481l-0.039,0.021L49.7,12.261c-0.097,0.063-0.181,0.133-0.254,0.207L49.4,12.484l-0.19,0.142 	l-0.134,0.102l-0.275,0.05l-0.313-0.174l-0.007-0.035c0.239-0.401,0.274-0.867,0.274-1.236c-0.002-0.507-0.254-2.994-0.628-3.566 	C47.332,6.509,43.51,6.113,42.209,6.113 M40.81,42.127l0.034-0.266l0.05-0.398l0.168,1.051l0.034,0.217 C40.998,42.493,40.9,42.291,40.81,42.127"/></svg>';
		} else if (iconType == 'station') {
			return svg = '<svg class="station-icon ' + cssClass + '" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="64px" height="64px" viewBox="0 0 64 64" enable-background="new 0 0 64 64" xml:space="preserve"><path fill="'+ color + '" d="M23.178,3.181c13.569,0-1.152,2.692,26.072,2.902l0.684,0.07l0.149-1.708 c0.298-0.138,0.745-0.209,1.267-0.209c0.938,0,2.115,0.228,3.103,0.699l-0.161,1.666l0.625,0.064l-0.464,4l-0.551-0.05l-2.28,23.485 l0.712,0.064l-0.583,3.417l-0.462-0.053L49.083,60.25c-0.623,0.277-1.117,0.426-1.595,0.426c-0.673,0-1.313-0.292-2.238-0.926 l1.982-22.685L46.666,37c-28.416-1.416-5.416-4.75-37.582-6l3-27.5C17.088,3.276,20.631,3.181,23.178,3.181"/><path fill="'+ strokeColor + '" d="M23.179,3.181c-2.547,0-6.091,0.095-11.095,0.319l-3,27.5c32.166,1.25,9.166,4.584,37.583,6l0.566,0.065L45.25,59.75 c0.926,0.634,1.566,0.926,2.238,0.926c0.479,0,0.973-0.148,1.596-0.426l2.205-22.719l0.461,0.053l0.584-3.417l-0.712-0.064 l2.28-23.485l0.551,0.05l0.464-4l-0.626-0.064l0.162-1.666c-0.987-0.471-2.166-0.699-3.104-0.699c-0.521,0-0.968,0.071-1.266,0.209 l-0.149,1.708l-0.685-0.07C22.026,5.873,36.748,3.181,23.179,3.181 M47.524,33.729l-0.69-0.063l2.083-23.5l0.661,0.06L47.524,33.729 M23.179,1.511c5.813,0,6.894,0.482,8.174,1.27c0.961,0.591,2.403,1.479,17.059,1.625l0.009-0.105l0.084-0.962l0.877-0.407 c0.52-0.242,1.183-0.364,1.969-0.364c1.264,0,2.692,0.322,3.823,0.862l1.056,0.504l-0.113,1.164l-0.002,0.014l0.657,0.068 l-0.194,1.68l-0.465,4l-0.188,1.617l-0.52-0.047l-1.957,20.161l0.837,0.076l-0.304,1.782l-0.584,3.417l-0.266,1.558l-0.344-0.039 l-2.041,21.027l-0.094,0.969l-0.889,0.396c-0.596,0.266-1.393,0.57-2.275,0.57c-1.232,0-2.258-0.585-3.182-1.218l-0.805-0.551 l0.085-0.973l1.835-20.997c-13.095-0.713-14.922-1.895-16.854-3.143c-1.571-1.016-3.352-2.167-19.549-2.796l-1.79-0.07l0.194-1.78 l3-27.5l0.155-1.423l1.431-0.064C16.828,1.616,20.481,1.511,23.179,1.511L23.179,1.511z"/></svg>';
		} else if (iconType == 'system') {
			return svg = '<svg class="gear-icon ' + cssClass + '" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" 	 width="1.5em" height="1.5em" viewBox="0 0 64 64" enable-background="new 0 0 64 64" xml:space="preserve"> <path fill="' + color + '" d="M57.607,32.951c0.012-0.315,0.018-0.632,0.018-0.951c0-2.439-0.343-4.854-1.02-7.176l-4.336,1.262 	c-0.566-1.945-1.406-3.769-2.474-5.438l3.808-2.435c-1.308-2.044-2.896-3.893-4.724-5.494l-2.979,3.4 	c-1.497-1.312-3.179-2.41-5.004-3.26l1.909-4.101c-2.205-1.027-4.544-1.731-6.95-2.095l-0.677,4.476 	c-1.04-0.157-2.096-0.265-3.179-0.265c-0.949,0-1.876,0.084-2.792,0.206l-0.593-4.483c-2.414,0.319-4.765,0.98-6.988,1.965 	l1.829,4.128c-1.842,0.817-3.547,1.884-5.067,3.167l-2.909-3.447c-1.857,1.567-3.48,3.387-4.825,5.408l3.752,2.496 	c-1.098,1.65-1.975,3.46-2.577,5.393l-4.297-1.339c-0.72,2.312-1.108,4.721-1.152,7.159l4.516,0.082 	c-0.002,0.131-0.02,0.258-0.02,0.39c0,1.919,0.279,3.77,0.758,5.537l-4.367,1.184c0.636,2.346,1.604,4.587,2.878,6.663l3.857-2.365 	c1.049,1.711,2.332,3.256,3.809,4.6l-3.043,3.347c1.799,1.636,3.817,3.006,5.999,4.071l1.986-4.065 	c1.771,0.865,3.677,1.489,5.684,1.831l-0.759,4.46c1.418,0.241,2.872,0.363,4.322,0.363c0.975,0,1.956-0.056,2.917-0.165 	l-0.51-4.481c2.028-0.23,3.972-0.739,5.784-1.502l1.748,4.148c2.239-0.943,4.331-2.2,6.219-3.736l-2.845-3.495 	c1.552-1.262,2.917-2.74,4.058-4.388l3.709,2.567c1.386-2.003,2.477-4.187,3.242-6.49l-4.285-1.424 	c0.617-1.858,0.974-3.831,1.049-5.879L57.607,32.951z M32,43.896c-6.57,0-11.896-5.326-11.896-11.896S25.43,20.104,32,20.104 	S43.896,25.43,43.896,32S38.57,43.896,32,43.896z"/> <path fill="' + strokeColor + '" d="M28.615,6.598l0.593,4.483c0.916-0.121,1.843-0.206,2.792-0.206c1.083,0,2.139,0.107,3.179,0.265l0.677-4.476 	c2.406,0.364,4.745,1.068,6.95,2.095l-1.909,4.101c1.825,0.85,3.507,1.948,5.004,3.26l2.979-3.4c1.827,1.601,3.416,3.45,4.724,5.494 	l-3.808,2.435c1.067,1.669,1.907,3.493,2.474,5.438l4.336-1.262c0.677,2.323,1.02,4.737,1.02,7.176c0,0.318-0.006,0.635-0.018,0.951 	l-4.521-0.17c-0.075,2.048-0.432,4.021-1.049,5.879l4.285,1.424c-0.766,2.304-1.856,4.487-3.242,6.49l-3.709-2.567 	c-1.141,1.647-2.506,3.126-4.058,4.388l2.845,3.495c-1.888,1.536-3.979,2.793-6.219,3.736l-1.748-4.148 	c-1.813,0.763-3.756,1.271-5.784,1.502l0.51,4.481c-0.961,0.109-1.942,0.165-2.917,0.165c-1.45,0-2.904-0.122-4.322-0.363 	l0.759-4.46c-2.007-0.342-3.913-0.966-5.684-1.831l-1.986,4.065c-2.182-1.065-4.2-2.436-5.999-4.071l3.043-3.347 	c-1.477-1.344-2.76-2.889-3.809-4.6l-3.857,2.365c-1.273-2.076-2.242-4.317-2.878-6.663l4.367-1.184 	c-0.479-1.768-0.758-3.618-0.758-5.537c0-0.132,0.017-0.259,0.02-0.39l-4.516-0.082c0.044-2.438,0.432-4.847,1.152-7.159 	l4.297,1.339c0.602-1.932,1.479-3.742,2.577-5.393l-3.752-2.496c1.345-2.021,2.968-3.84,4.825-5.408l2.909,3.447 	c1.52-1.284,3.225-2.351,5.067-3.167l-1.829-4.128C23.85,7.578,26.201,6.917,28.615,6.598 M32,43.896 	c6.57,0,11.896-5.326,11.896-11.896S38.57,20.104,32,20.104S20.104,25.43,20.104,32S25.43,43.896,32,43.896 M29.871,4.959 	L28.423,5.15c-2.551,0.337-5.037,1.036-7.388,2.078L19.7,7.819l0.591,1.335l1.256,2.836c-1.033,0.54-2.021,1.157-2.955,1.846 	l-1.998-2.367l-0.941-1.116l-1.116,0.942c-1.962,1.657-3.678,3.579-5.099,5.715L8.63,18.226l1.216,0.809l2.575,1.713 	c-0.584,1.013-1.087,2.064-1.505,3.146l-2.95-0.919l-1.394-0.434l-0.435,1.394c-0.761,2.444-1.171,4.99-1.218,7.567l-0.026,1.459 	l1.46,0.027l3.088,0.056c0.056,1.144,0.205,2.299,0.444,3.454l-3,0.813l-1.41,0.382l0.382,1.409c0.672,2.479,1.696,4.85,3.042,7.045 	l0.763,1.244l1.245-0.764l2.653-1.626c0.669,0.947,1.411,1.844,2.219,2.68l-2.093,2.301l-0.982,1.08l1.081,0.982 	c1.903,1.73,4.036,3.178,6.34,4.303l1.312,0.641l0.641-1.312l1.366-2.796c1.077,0.441,2.185,0.799,3.316,1.068l-0.522,3.067 	l-0.245,1.439l1.439,0.245c1.498,0.255,3.034,0.384,4.567,0.384c1.028,0,2.065-0.059,3.082-0.175l1.45-0.165l-0.165-1.45 	l-0.35-3.076c1.153-0.206,2.282-0.498,3.376-0.875l1.2,2.849l0.567,1.345l1.345-0.566c2.367-0.997,4.579-2.326,6.574-3.949 	l1.132-0.922l-0.921-1.133l-1.953-2.398c0.851-0.789,1.642-1.645,2.364-2.558l2.547,1.763l1.201,0.831l0.83-1.2 	c1.465-2.117,2.618-4.426,3.428-6.86l0.46-1.386l-1.386-0.461l-2.946-0.979c0.29-1.116,0.493-2.262,0.609-3.426l3.107,0.116 	l1.459,0.056l0.055-1.46c0.013-0.333,0.019-0.668,0.019-1.005c0-2.578-0.362-5.13-1.078-7.584l-0.408-1.401l-1.401,0.408 	l-2.98,0.868c-0.396-1.091-0.88-2.151-1.443-3.172l2.616-1.673l1.23-0.787l-0.787-1.23c-1.382-2.162-3.062-4.115-4.991-5.806 	l-1.098-0.962l-0.962,1.098l-2.049,2.338c-0.921-0.707-1.896-1.342-2.917-1.9l1.313-2.82l0.616-1.323l-1.323-0.617 	c-2.33-1.085-4.803-1.83-7.349-2.215L34.63,5.002l-0.218,1.443l-0.464,3.068C33.266,9.447,32.627,9.416,32,9.416 	c-0.492,0-0.995,0.02-1.532,0.063l-0.406-3.072L29.871,4.959L29.871,4.959z M32,42.437c-5.755,0-10.437-4.682-10.437-10.437 	S26.245,21.563,32,21.563S42.437,26.245,42.437,32S37.755,42.437,32,42.437L32,42.437z"/> </svg>';
		} else if (iconType == 'company') {
			return svg = '<svg class="gear-icon ' + cssClass + '" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="1.5em" height="1.5em" viewBox="0 0 64 64" enable-background="new 0 0 64 64" xml:space="preserve"> <path fill="' + color + '" d="M60.236,25.352l-1.107-1.573c-0.016-0.123,0.143-1.466,0.184-2.031c0.053-0.688,0.083-1.29,0.083-1.29 	l-3.315-3.697c0,0-2.523,1.203-2.68,1.292l-0.092,0.186l-0.277,0.093l-0.369,0.277l-1.016,0.185l-0.833-0.462l-0.558,0.062 	c0.021-0.213,0.04-0.411,0.05-0.555c0.05-0.636,0.077-1.185,0.078-1.215l0.063-0.047c0.054-0.075,0.073-0.241,0.073-0.461 	c-0.001-0.841-0.321-2.451-0.351-2.495c-0.169-0.268-2.188-0.896-4.235-0.896c-0.648,0-1.301,0.063-1.897,0.221 	c-1.535,0.405-2.546,0.894-3.178,1.272c0.004-0.062,0.008-0.12,0.011-0.174c0.367-0.169,0.709-0.364,0.818-0.546l-0.069-0.378 	l0.262-0.197c0.051-0.071,0.07-0.229,0.07-0.438c-0.002-0.799-0.306-2.329-0.334-2.371c-0.16-0.255-2.079-0.852-4.024-0.852 	c-0.617,0-1.236,0.059-1.804,0.21c-1.267,0.334-2.155,0.729-2.764,1.064l-0.01-0.053l0.234-0.177 	c0.045-0.063,0.063-0.206,0.063-0.394c-0.002-0.719-0.274-2.094-0.3-2.131c-0.145-0.229-1.868-0.766-3.617-0.766 	c-0.554,0-1.111,0.053-1.621,0.189c-2.438,0.644-3.367,1.544-3.44,1.602c-0.527,0.42-0.45,0.773-0.315,1.658 	c0.052,0.339,0.146,0.933,0.236,1.103c0.128,0.235,0.553,0.316,0.553,0.316l0.235,0.631c0.229,0.099,0.629,0.125,0.975,0.125 	c0.354,0,0.65-0.026,0.65-0.026l0.082,0.205l-0.669,0.245l-0.144-0.033l-0.627,0.22l-2.449-0.604l-2.868,2.159l0.79,3.315 	l1.104,0.631c0,0-0.077,0.305-0.157,0.629c-0.081,0.327-0.157,0.712-0.157,0.712l-1.025-1.262l-2.368-0.633l-1.263,1.262 	l0.316,0.396l-0.078,0.237l0.158,0.236l-1.026,0.237c0,0-1.132-0.331-1.342-0.396c-0.248-0.075-0.364-0.256-0.627-0.256l-0.161,0.02 	c-0.088,0.021-0.258,0.157-0.395,0.315l-0.079,0.238c-0.159,0.231-2.142,2.275-2.287,2.367l-0.047,0.004 	c-0.226,0-0.792-0.223-1.562-0.223c-0.801,0-1.823,0.241-2.907,1.22c-1.699,1.531-2.211,3.803-1.795,4.756 	c0.071,0.166,0.294,0.44,0.294,0.44L4.797,29.64l0.048,0.231l-0.238,0.238c-0.036,0.22,0.079,0.553,0.079,0.553l-1.948,1.755 	c0,0-0.146,0.235-0.079,0.508c0.048,0.188,0.186,0.39,0.186,0.39L2.29,33.794c0,0-0.283,0.448,0.664,1.521 	c0.619,0.704,1.036,0.825,1.249,0.825c0.113,0,0.169-0.034,0.169-0.034l0.552-0.399c0,0,0.225,0.161,0.389,0.204l0.237,0.031 	c0.135,0,0.222-0.031,0.222-0.031l3.333-2.803l0.079-0.396l0.237-0.314h0.553l0.442-0.315c-0.04,0.48-0.001,0.903,0.129,1.202 	c0.08,0.183,0.327,0.489,0.327,0.489l-0.645,0.658l0.054,0.257l-0.264,0.265c-0.04,0.244,0.089,0.615,0.089,0.615l-2.168,1.952 	c0,0-0.162,0.261-0.087,0.565c0.053,0.209,0.206,0.434,0.206,0.434l-0.617,0.531c0,0-0.315,0.501,0.738,1.692 	c0.689,0.784,1.152,0.919,1.39,0.919c0.125,0,0.188-0.038,0.188-0.038l0.614-0.445c0,0,0.251,0.18,0.433,0.229 	c0.1,0.024,0.187,0.032,0.264,0.032c0.15,0,0.247-0.032,0.247-0.032l3.708-3.119l0.088-0.44l0.264-0.349h0.615l1.377-0.982 	c-0.079,0.598-0.048,1.126,0.109,1.484c0.084,0.194,0.344,0.516,0.344,0.516l-0.678,0.692l0.057,0.271l-0.278,0.278 	c-0.042,0.257,0.093,0.647,0.093,0.647l-2.281,2.055c0,0-0.17,0.274-0.091,0.595c0.055,0.22,0.216,0.456,0.216,0.456l-0.649,0.56 	c0,0-0.332,0.526,0.776,1.781c0.725,0.823,1.212,0.966,1.462,0.966c0.132,0,0.197-0.04,0.197-0.04l0.646-0.468 	c0,0,0.264,0.188,0.456,0.239c0.104,0.026,0.197,0.035,0.278,0.035c0.158,0,0.26-0.035,0.26-0.035l2.12-1.783l0.836,0.156 	l3.534-0.702c0.071,0.263,0.143,0.418,0.17,0.477c0.119,0.259,0.219,0.539,0.35,0.7l0.032,0.309l-0.72,1.376l0.138,3.646 	l3.776,0.706l4.369-0.868c0.034,0.063,0.066,0.136,0.104,0.183l0.033,0.324l-0.757,1.446l0.146,3.839l3.973,0.741l6.396-1.271 	l0.034-3.217l2.623-0.039l0.979-0.636c0.25,0.608,0.579,1.031,0.579,1.031l0.776,0.516l0.322,4.903l6.095-0.088l3.426-2.223 	c0,0-0.052-2.051-0.058-2.277c0,0-0.078-0.177-0.092-0.278c-0.044-0.34-0.294-1.331-0.276-1.755c0.005-0.16,0.128-0.403,0.185-0.647 	c0.061-0.278,0.029-0.699,0.092-0.833c0.075-0.158,0.393-0.308,0.46-0.368c0.182-0.147,0.526-0.834,0.414-1.883 	c-0.083-0.761-0.502-1.531-0.506-1.535c-0.137-0.143-0.579-0.154-0.645-0.369c-0.495-1.611-1.479-2.862-1.479-2.862l-0.321-3.117 	l1.151-0.393c0.24,0.018,0.231,0.294,0.37,0.37c0.144,0.077,0.281,0.106,0.411,0.106c0.256,0,0.471-0.117,0.604-0.2l0.557-1.108 	c0,0,0.563-0.177,0.738-0.276c0.592-0.342,0.739-0.831,0.739-0.831v-1.387l-0.187-0.553l0.463-1.664V25.352z"/> <path fill="' + strokeColor + '" d="M61.313,24.599l-0.551-0.789c-0.107-0.151-0.203-0.288-0.29-0.408c0.017-0.174,0.038-0.376,0.054-0.536 	c0.039-0.379,0.079-0.771,0.098-1.019c0.051-0.697,0.082-1.298,0.084-1.323l0.027-0.541l-0.361-0.403l-3.315-3.697l-0.655-0.731 	l-0.887,0.423c-1.702,0.812-2.632,1.26-2.762,1.335l-0.035,0.019l-0.034,0.021l-0.229,0.187l-0.041,0.015l-0.172,0.128l-0.121,0.092 	l-0.248,0.045l-0.281-0.157l0.004,0.002c0.001-0.021,0.003-0.042,0.004-0.063c-0.006,0.009-0.008,0.02-0.014,0.029 	c0.215-0.362,0.247-0.781,0.247-1.114c-0.002-0.457-0.229-2.698-0.566-3.213c-0.717-1.134-4.161-1.491-5.334-1.491 	c-0.817,0-1.569,0.089-2.232,0.264c-0.194,0.051-0.367,0.106-0.548,0.16c-0.079-0.808-0.257-2.045-0.492-2.404 	c-0.682-1.077-3.955-1.417-5.069-1.417c-0.776,0-1.491,0.085-2.122,0.251c-0.426,0.112-0.804,0.233-1.161,0.357 	C34.224,8.019,34.1,7.395,33.95,7.167c-0.611-0.968-3.555-1.273-4.556-1.273c-0.698,0-1.341,0.076-1.907,0.226 	c-2.21,0.583-3.366,1.387-3.864,1.818c-0.001,0.001-0.003,0.003-0.005,0.004l0.002-0.002c-1,0.809-0.861,1.718-0.726,2.597 	l0.014,0.097c0.06,0.396,0.111,0.685,0.164,0.907l-0.459-0.113l-0.426,0.321l-2.869,2.159l-0.586,0.441l0.169,0.715l0.55,2.312 	l-0.985-0.262l-0.624-0.167l-0.458,0.457l-1.261,1.261l-0.53,0.528c-0.122-0.037-0.226-0.068-0.289-0.086l-0.034-0.021 	c-0.169-0.103-0.484-0.294-0.955-0.294c-0.135,0-0.274,0.017-0.415,0.049c-0.426,0.1-0.773,0.423-0.992,0.676 	c-0.127,0.152-0.199,0.304-0.24,0.428c-0.324,0.358-1.155,1.221-1.642,1.708c-0.317-0.066-0.738-0.14-1.243-0.14 	c-1.318,0-2.549,0.508-3.659,1.507c-1.935,1.746-2.643,4.363-2.145,5.852l-0.403,0.411l0.056,0.268 	c-0.062,0.11-0.107,0.233-0.131,0.371c-0.018,0.107-0.023,0.215-0.022,0.319l-1.493,1.346L1.87,31.69l-0.083,0.134 	c-0.083,0.134-0.32,0.573-0.256,1.143L1.43,33.053l-0.09,0.143c-0.219,0.349-0.583,1.325,0.772,2.862 	c0.704,0.799,1.408,1.204,2.09,1.204c0.272,0,0.535-0.069,0.744-0.192l0.043-0.024l0.041-0.031l0.019-0.013 	c0.164,0.04,0.332,0.062,0.501,0.062c0.285,0,0.495-0.06,0.594-0.096l0.193-0.065l0.156-0.134l2.288-1.923 	c-0.009,0.085-0.02,0.172-0.018,0.253l-1.661,1.497L6.97,36.713l-0.092,0.148c-0.091,0.148-0.356,0.637-0.284,1.271l-0.112,0.095 	l-0.1,0.159c-0.245,0.39-0.648,1.476,0.858,3.186c0.784,0.888,1.567,1.341,2.326,1.341c0.303,0,0.596-0.078,0.827-0.215l0.048-0.029 	l0.045-0.032l0.021-0.016c0.182,0.045,0.369,0.069,0.557,0.069c0.316,0,0.551-0.066,0.661-0.105l0.215-0.075l0.174-0.148 	l3.572-3.002c0.028-0.087-0.036,0.017-0.063,0.179c-0.021,0.125-0.028,0.252-0.025,0.373l-1.748,1.575l-0.138,0.123l-0.097,0.157 	c-0.097,0.156-0.375,0.67-0.299,1.338l-0.118,0.1l-0.105,0.168c-0.257,0.408-0.683,1.552,0.904,3.351 	c0.825,0.935,1.648,1.41,2.447,1.41c0.319,0,0.627-0.081,0.871-0.226l0.05-0.029l0.047-0.035l0.022-0.017 	c0.191,0.048,0.388,0.072,0.587,0.072c0.333,0,0.579-0.068,0.695-0.11l0.226-0.078l0.182-0.156l1.834-1.541l0.073,0.014l0.211,0.04 	l0.212-0.042l2.488-0.494l0.029,0.065l-0.475,0.908l-0.154,0.294l0.013,0.331l0.138,3.648l0.039,0.997l0.98,0.184l3.776,0.703 	l0.235,0.045l0.235-0.046l2.182-0.434v-0.005l0.012,0.349l0.146,3.839l0.039,1.049l1.033,0.193l3.973,0.739l0.248,0.048l0.248-0.05 	l6.397-1.271l1.046-0.208l0.011-1.066l0.021-2.001l1.342-0.02l0.359-0.007l0.117-0.076c0-0.001-0.002-0.002-0.002-0.003 	c0.01,0.014,0.032,0.043,0.036,0.049l0.129,0.162l0.172,0.114l0.236,0.157l0.28,4.256l0.082,1.244l1.247-0.018l6.096-0.088 	l0.379-0.007l0.316-0.204l3.426-2.224l0.616-0.399l-0.019-0.735c0,0-0.053-2.042-0.056-2.27l-0.025-1.313l-0.245,0.003 	c-0.04-0.204-0.08-0.431-0.095-0.573l0.012-0.03c0.043-0.123,0.096-0.276,0.135-0.452c0.034-0.153,0.053-0.303,0.063-0.441 	l0.056-0.044c0.55-0.462,1.03-1.572,0.873-3.028c-0.11-1.025-0.629-2.01-0.76-2.182l-0.047-0.063l-0.055-0.059 	c-0.166-0.172-0.35-0.281-0.513-0.357c-0.41-1.098-0.974-1.994-1.29-2.451l-0.132-1.287c0.154,0.035,0.313,0.053,0.474,0.053 	c0.651,0,1.133-0.298,1.293-0.395l0.317-0.197l0.167-0.332l0.317-0.63c0.192-0.072,0.345-0.142,0.454-0.205 	c0.999-0.575,1.299-1.429,1.347-1.594l0.056-0.186v-0.191v-1.387v-0.215l-0.068-0.204l-0.058-0.171l0.354-1.274l0.049-0.173v-0.18 	v-8.864v-0.415L61.313,24.599z M5.772,35.91c0,0-0.087,0.031-0.222,0.031L5.313,35.91c-0.164-0.043-0.389-0.204-0.389-0.204 	l-0.552,0.399c0,0-0.056,0.034-0.169,0.034c-0.213,0-0.63-0.121-1.249-0.825c-0.947-1.072-0.664-1.521-0.664-1.521l0.556-0.479 	c0,0-0.138-0.201-0.186-0.39c-0.067-0.273,0.079-0.508,0.079-0.508l1.948-1.755c0,0-0.115-0.333-0.079-0.553l0.238-0.238 	L4.797,29.64l0.579-0.591c0,0-0.223-0.275-0.294-0.44c-0.416-0.953,0.096-3.225,1.795-4.756c1.084-0.979,2.106-1.22,2.907-1.22 	c0.77,0,1.336,0.223,1.562,0.223l0.047-0.004c0.145-0.092,2.127-2.136,2.287-2.367l0.079-0.238c0.137-0.158,0.307-0.294,0.395-0.315 	l0.161-0.02c0.263,0,0.379,0.181,0.627,0.256c0.21,0.065,1.342,0.396,1.342,0.396l1.026-0.237l-0.158-0.236l0.078-0.237 	l-0.316-0.396l1.263-1.262l2.368,0.633l1.025,1.262c0,0,0.076-0.385,0.157-0.712c0.081-0.325,0.157-0.629,0.157-0.629l-1.104-0.631 	l-0.79-3.315l2.868-2.159l2.449,0.604l0.627-0.22l0.144,0.033l0.669-0.245l-0.082-0.205c0,0-0.297,0.026-0.65,0.026 	c-0.346,0-0.746-0.026-0.975-0.125l-0.235-0.631c0,0-0.425-0.082-0.553-0.316c-0.091-0.17-0.185-0.764-0.236-1.103 	c-0.135-0.885-0.212-1.237,0.315-1.658c0.073-0.058,1.003-0.958,3.44-1.602c0.51-0.136,1.067-0.189,1.621-0.189 	c1.749,0,3.473,0.537,3.617,0.766c0.017,0.025,0.142,0.638,0.225,1.257c0.013-0.005,0.027-0.011,0.039-0.016 	c-1.086,0.479-1.754,0.961-2.108,1.27l0.005-0.005c-1.119,0.899-0.962,1.912-0.812,2.892l0.017,0.107 	c0.067,0.44,0.123,0.762,0.182,1.009l-0.512-0.126l-0.474,0.356l-3.192,2.402l-0.651,0.491l0.188,0.795l0.613,2.572l-1.096-0.291 	l-0.694-0.186l-0.51,0.508l-1.403,1.403l-0.589,0.588c-0.136-0.041-0.252-0.075-0.322-0.096l-0.037-0.023 	c-0.188-0.115-0.539-0.328-1.062-0.328c-0.15,0-0.307,0.019-0.462,0.054c-0.473,0.112-0.86,0.472-1.103,0.753 	c-0.142,0.169-0.221,0.338-0.268,0.477c-0.359,0.398-1.283,1.358-1.826,1.9c-0.353-0.073-0.821-0.155-1.383-0.155 	c-1.467,0-2.835,0.565-4.07,1.676c-1.84,1.66-2.673,4.021-2.534,5.708c0,0,0-0.001,0-0.001l-0.067,0.335L5.772,35.91z M15.372,37.5 	l-0.264,0.349l-0.088,0.44l-3.708,3.119c0,0-0.097,0.032-0.247,0.032c-0.077,0-0.165-0.008-0.264-0.032 	c-0.182-0.049-0.433-0.229-0.433-0.229l-0.614,0.445c0,0-0.062,0.038-0.188,0.038c-0.237,0-0.7-0.135-1.39-0.919 	c-1.053-1.191-0.738-1.692-0.738-1.692l0.617-0.531c0,0-0.153-0.225-0.206-0.434c-0.075-0.305,0.087-0.565,0.087-0.565l2.168-1.952 	c0,0-0.128-0.371-0.089-0.615l0.264-0.265l-0.054-0.257l0.645-0.658c0,0-0.248-0.307-0.327-0.489 	c-0.463-1.061,0.106-3.589,1.997-5.292c1.208-1.089,2.345-1.357,3.235-1.357c0.856,0,1.487,0.248,1.738,0.248l0.053-0.005 	c0.161-0.102,2.366-2.376,2.543-2.633l0.088-0.265c0.153-0.176,0.341-0.328,0.44-0.351l0.18-0.022c0.293,0,0.421,0.202,0.697,0.285 	c0.235,0.072,1.494,0.44,1.494,0.44l1.141-0.263l-0.176-0.263l0.088-0.264l-0.352-0.441l1.405-1.403l2.635,0.704l1.14,1.404 	c0,0,0.084-0.429,0.175-0.792c0.09-0.361,0.176-0.701,0.176-0.701l-1.229-0.702l-0.878-3.688l3.191-2.402l2.725,0.672l0.697-0.244 	l0.16,0.037l0.743-0.272l-0.091-0.228c0,0-0.331,0.029-0.725,0.029c-0.386,0-0.829-0.028-1.084-0.138l-0.263-0.702 	c0,0-0.473-0.091-0.613-0.352c-0.102-0.189-0.205-0.85-0.264-1.228c-0.15-0.985-0.236-1.376,0.351-1.844 	c0.082-0.064,1.115-1.067,3.827-1.783c0.567-0.151,1.187-0.21,1.804-0.21c1.945,0,3.864,0.597,4.024,0.852 	c0.025,0.038,0.276,1.299,0.324,2.129c-1.477,0.574-2.338,1.191-2.768,1.565l0.007-0.005c-1.178,0.947-1.014,2.012-0.854,3.043 	l0.017,0.113c0.07,0.463,0.129,0.802,0.19,1.062l-0.537-0.133l-0.499,0.375l-3.358,2.527l-0.686,0.517l0.199,0.837l0.644,2.707 	l-1.153-0.307l-0.73-0.195l-0.537,0.535l-1.477,1.476l-0.619,0.619c-0.143-0.043-0.266-0.079-0.339-0.101l-0.04-0.025 	c-0.197-0.121-0.566-0.345-1.117-0.345c-0.158,0-0.322,0.02-0.486,0.057c-0.498,0.117-0.905,0.495-1.16,0.792 	c-0.148,0.178-0.233,0.355-0.281,0.501c-0.379,0.419-1.352,1.429-1.922,2c-0.371-0.077-0.864-0.164-1.456-0.164 	c-1.543,0-2.983,0.595-4.282,1.764c-1.938,1.748-2.815,4.236-2.667,6.012l-0.042,0.03H15.372z M22.569,44.658l0.458-0.385 	l0.352-0.296l0.042-0.204c0.035,0.262,0.129,0.71,0.125,0.69L22.569,44.658z M31.428,50.563l0.081,0.184l0.039,0.086l-3.031,0.603 	l-3.776-0.706l-0.138-3.646l0.72-1.376l-0.032-0.309c-0.131-0.161-0.231-0.441-0.35-0.7c-0.056-0.118-0.292-0.629-0.334-1.65 	l0.217-0.155c0.216,0.067,0.43,0.103,0.639,0.103c0.327,0,0.567-0.083,0.713-0.153l0.064-0.03l0.059-0.038l0.471-0.292 	c0.229-0.004,0.43-0.043,0.611-0.116c0.244-0.099,0.244-0.099,2.271-1.941l0.111-0.103l0.021,0.004l0.195,0.01l0.188-0.01 	c0.175,0.163,0.375,0.301,0.604,0.387c0.328,0.123,0.662,0.187,0.992,0.187c0.321,0,0.717-0.06,1.132-0.264L32.7,42.383 	l-0.039,0.346l0.067,0.156l-0.208,0.206c-0.845,0.977-1.363,2.258-1.513,3.714C30.853,48.334,30.997,49.633,31.428,50.563z 	 M44.127,52.593l0.005-0.439c0.071-0.207,0.145-0.415,0.185-0.517c0.099-0.164,0.21-0.361,0.326-0.588 	c0.069,0.123,0.14,0.233,0.205,0.33c0.028,0.081,0.06,0.188,0.09,0.293c0.06,0.195,0.127,0.417,0.217,0.654 	c0.035,0.091,0.074,0.166,0.112,0.25L44.127,52.593z M44.673,43.865l0.03-0.239l0.045-0.359l0.151,0.947l0.031,0.195 	C44.843,44.196,44.755,44.013,44.673,43.865z M60.236,34.216l-0.463,1.664l0.187,0.553v1.387c0,0-0.147,0.489-0.739,0.831 	c-0.176,0.1-0.738,0.276-0.738,0.276l-0.557,1.108c-0.133,0.083-0.348,0.2-0.604,0.2c-0.13,0-0.268-0.029-0.411-0.106 	c-0.139-0.076-0.13-0.353-0.37-0.37l-1.151,0.393l0.321,3.117c0,0,0.983,1.251,1.479,2.862c0.065,0.215,0.508,0.227,0.645,0.369 	c0.004,0.004,0.423,0.774,0.506,1.535c0.112,1.049-0.232,1.735-0.414,1.883c-0.067,0.061-0.385,0.21-0.46,0.368 	c-0.063,0.134-0.031,0.555-0.092,0.833c-0.057,0.244-0.18,0.487-0.185,0.647c-0.018,0.424,0.232,1.415,0.276,1.755 	c0.014,0.102,0.092,0.278,0.092,0.278c0.006,0.227,0.058,2.277,0.058,2.277L54.189,58.3l-6.095,0.088l-0.322-4.903l-0.776-0.516 	c0,0-0.361-0.456-0.614-1.109c-0.154-0.404-0.24-0.818-0.369-1.11c0,0-0.387-0.518-0.422-0.857 	c-0.035-0.339-0.104-1.856-0.039-2.006c0.061-0.145,0.236-0.184,0.274-0.368c0.035-0.151,0.012-0.857,0.222-1.829 	c0.211-0.973,0.703-1.312,0.703-1.312l-0.555-0.371l-0.737-4.615l-1.017-0.095l-0.177-0.998l-0.748-0.109l0.464,0.646L43.4,43.462 	l-0.417,0.28c0,0,0.25,0.325,0.352,0.45c0.136,0.167,0.969,1.45,0.851,3.814c-0.076,1.505-0.936,2.854-1.035,3.021l-0.329,0.899 	l-0.041,3.902L36.384,57.1l-3.973-0.741l-0.146-3.839l0.757-1.446l-0.033-0.324c-0.138-0.171-0.243-0.466-0.368-0.737 	c-0.079-0.167-0.509-1.084-0.306-3.073c0.201-1.991,1.177-2.948,1.227-3.024l0.029-0.007l0.128,0.016l0.027-0.009l0.556-0.737 	l-0.277-0.647l0.37-3.325c0,0-0.372-0.189-0.648-0.277c-0.197-0.061-0.325-0.19-0.552-0.19l-0.094,0.007 	c-0.159,0.228-0.594,0.842-1.318,0.842c-0.162,0-0.338-0.032-0.529-0.104c-0.281-0.105-0.58-0.715-0.58-0.715h-0.298 	c0,0-0.146,0.256-0.376,0.256L29.94,39.02c-0.414-0.051-0.649-0.369-0.734-0.369h-0.004c-0.096,0.009-0.369,0.276-0.369,0.276 	l-0.066,0.524l-1.874,1.693l-0.177,0.022c-0.137,0-0.285-0.022-0.285-0.022l-0.824,0.514c0,0-0.049,0.022-0.145,0.022 	c-0.091,0-0.226-0.021-0.404-0.105c-0.129-0.062-0.268-0.272-0.268-0.272l-1.591,1.135h-0.646l-0.277,0.368l-0.093,0.463 	L18.28,46.55c0,0-0.102,0.035-0.26,0.035c-0.081,0-0.174-0.009-0.278-0.035c-0.192-0.052-0.456-0.239-0.456-0.239l-0.646,0.468 	c0,0-0.065,0.04-0.197,0.04c-0.25,0-0.737-0.143-1.462-0.966c-1.108-1.255-0.776-1.781-0.776-1.781l0.649-0.56 	c0,0-0.161-0.236-0.216-0.456c-0.079-0.32,0.091-0.595,0.091-0.595l2.281-2.055c0,0-0.136-0.391-0.093-0.647l0.278-0.278 	l-0.057-0.271l0.678-0.692c0,0-0.26-0.321-0.344-0.516c-0.487-1.115,0.113-3.775,2.102-5.567c1.27-1.146,2.466-1.428,3.403-1.428 	c0.901,0,1.565,0.261,1.829,0.261l0.056-0.005c0.169-0.107,2.489-2.5,2.677-2.771l0.093-0.279c0.16-0.185,0.359-0.344,0.462-0.369 	l0.189-0.023c0.309,0,0.443,0.212,0.734,0.3c0.246,0.076,1.571,0.463,1.571,0.463l1.2-0.277l-0.185-0.277l0.092-0.277l-0.37-0.464 	l1.479-1.477l2.772,0.741l1.2,1.477c0,0,0.088-0.451,0.184-0.833c0.095-0.38,0.185-0.738,0.185-0.738l-1.292-0.739l-0.924-3.88 	l3.357-2.527l2.867,0.708l0.733-0.257l0.168,0.039l0.783-0.286l-0.096-0.24c0,0-0.349,0.031-0.763,0.031 	c-0.405,0-0.873-0.03-1.141-0.146l-0.275-0.738c0,0-0.498-0.096-0.646-0.371c-0.107-0.199-0.217-0.894-0.277-1.292 	c-0.157-1.036-0.248-1.448,0.369-1.94c0.086-0.068,1.174-1.123,4.027-1.876c0.597-0.158,1.249-0.221,1.897-0.221 	c2.047,0,4.066,0.628,4.235,0.896c0.029,0.044,0.35,1.654,0.351,2.495c0,0.22-0.02,0.386-0.073,0.461l-0.275,0.208l0.072,0.398 	c-0.283,0.472-2.047,1.035-2.047,1.035l0.06,0.121l1.176-0.098l0.553,0.185l0.829-0.092l0.833,0.462l1.016-0.185l0.369-0.277 	l0.277-0.093l0.092-0.186c0.156-0.088,2.68-1.292,2.68-1.292l3.315,3.697c0,0-0.03,0.603-0.083,1.29 	c-0.041,0.565-0.199,1.909-0.184,2.031l1.107,1.573V34.216z"/> </svg>'
		}
	},
	updateGameInfo: function(thisGame) {
		$('.gameinfo-type').html(thisGame.gameType);
		$('.gameinfo-round').html(thisGame.round);
		$('.gameinfo-remaining').html(thisGame.roundsRemaining(true));
		$('.gameinfo-doomsday').html(thisGame.doomsday);
	},
	updateSystemsInputs: function() {
		$('#team-systems').attr('max', $('#team-frames').val()*4 ).slider( "refresh" );
	},
	updateTeamList: function(thisGame) {

		$('#teams').empty();

		for (var i in thisGame.teams) {
			var newteam = '<li id="team_'+ i +'" data-teamid="' + i + '">'
			+ '<a href="#team-adjust" data-rel="popup" data-position-to="window" data-transition="pop" class="team-manage">'
			+ '<h2>' + thisGame.teams[i].name +'</h2><div class="team-display-info">'
			+ mfzch.getIcon('frame', thisGame.teams[i].color, 'game-icon') + thisGame.teams[i].gFrames + ' ' + mfzch.getIcon('system', thisGame.teams[i].color, 'game-icon') + thisGame.teams[i].sSystems
			+ '</div>';

			if (thisGame.teams[i].cProfile == true) {
				newteam += '<span class="ui-li-count';
				if (thisGame.teams[i].cNonstandard == true) {
					newteam += ' ui-body-c';
				}
				newteam += '">SU</span>';
			}

			newteam += '</a><a href="#" class="team-del">Delete</a></li>'
			$('#teams').append(newteam);
		}

		if (thisGame.teams.length > 1) {
			if (!$('#game-start-li').length) {
				$('#game-params').append('<li id="game-start-li"><a href="#" id="game-start" class="ui-btn ui-btn-b ui-icon-carat-r ui-btn-icon-right">Deploy Companies</a></li>');
			}
		} else {
			$('#game-start-li').remove();
		}
		$('#game-params').listview('refresh');

		if (thisGame.teams.length < MAXTEAMS) {
			$('#teams').append('<li><a href="#" id="team-add" class="ui-btn ui-btn-a ui-icon-plus ui-btn-icon-left">Add Company</a></li>');
		}

		$('#teams').listview('refresh');
	},
	updateSetupParameters: function(thisGame) {
		thisGame.updateParameters();

		// create text
		var longText = 'For a '+ thisGame.teams.length +'-player ';
		if (thisGame.gameType == 'Battle') {
			var longText = longText + 'Battle';
		} else if (thisGame.gameType == 'Skirmish') {
			var longText = longText + 'Skirmish';
		} else {
			var longText = longText + 'game';
		}
		var longText = longText + ', each company must have '
		+ thisGame.minFrames + '&#8211;' + thisGame.maxFrames + ' frames.';

		// update HTML
		$('.max_frames').html(thisGame.maxFrames);
		$('.min_frames').html(thisGame.minFrames);
		$('.stations_per_player').html(thisGame.stationsPerPlayer);
		$('.param_longtext').html(longText);
		$('#game-type-switch').selectmenu('refresh');
		$('#game-tracking-level').selectmenu('refresh');

		if (thisGame.gameType == 'Demo/Free') {
			$('.stations_per_player').html('0&#8211;9');
		}

		// check for all profiled companies
		$('#game-tracking-level').selectmenu('enable');
		for (var i in this.game.teams) {
			if (!this.game.teams[i].cProfile) {
				$('#game-tracking-level').val(10);
				$('#game-tracking-level').selectmenu('refresh').selectmenu('disable');
				break;
			}
		}

	},
	randomTeamName: function() {
		var list1 = ['Advanced', 'Ahu', 'Aleph', 'Alpha', 'Amritsar', 'Assault', 'Astromax', 'Beta', 'Bhadal', 'Blood', 'Boussht', 'Burned Moon', 'Callisto', 'Celiel', 'Ceres', 'Chabbing', 'Chet\'s', 'Chrome', 'Crimson', 'Deadeye', 'Deimos', 'Deku', 'Doomed', 'Dragon-slaying', 'Earth', 'Ekmer', 'Elite', 'Endymion', 'Enniot City', 'Enorn Two', 'Europa', 'Ferocious', 'Free Colony', 'Freedom', 'Gamma', 'Ganymede', 'Gemmel', 'Guerrilla', 'Guild', 'Gursk', 'Heavy', 'Gen. Hezeraiah\'s', 'Horrible', 'Hurdy-gurdy', 'Hutching', 'Hyperion', 'Ijad', 'Invincible', 'Io', 'Jakarta', 'Jovian', 'Junker', 'Kigali', 'Kush', 'Labor', 'Leda', 'Lunar', 'Luzon', 'Martian', 'Mechanical', 'Midnight', 'Mieze', 'Millennium', 'Momozono\'s', 'Nanking', 'Newport Station', 'Northern Republic', 'Omega', 'Omicron', 'Orbital', 'Outback', 'Pathetic', 'Peach', 'Peloto', 'Phobos', 'Phoenix', 'Poshet', 'Prototype', 'Quall', 'Queslett', 'Ragged', 'Ransoll', 'Rock', 'Rookie', 'Rusty', 'Salvage', 'Selene', 'Scrap', 'Shebehu', 'Shiny', 'Shock', 'Sigma', 'Sol', 'Solar Union', 'Southport', 'Space', 'Spice', 'Steel', 'Stone', 'Strongarm', 'Support', 'TEM', 'Titan', 'TTA', 'TTM', 'Terran', 'Test', 'Thunder', 'Tien Shan', 'Transit Gate', 'Twankus Prime', 'UMFL', 'United', 'Venusian', 'Veteran', 'Wandering', 'Weeping Widow', 'Worthless'];
		var list2 = ['Anvil', 'Army', 'Assassins', 'Axe', 'Big Dogs', 'Blade', 'Brigade', 'Cannon', 'Cavaliers', 'Cell', 'Chabbers', 'Chuckers', 'Clanks', 'Cobras', 'Commandos', 'Company', 'Condors', 'Conscripts', 'Corps', 'Cowboys', 'Crew', 'Crusaders', 'Cultists', 'Deathtraps', 'Defenders', 'Delivery Service', 'Demolitions', 'Dragons', 'Eagles', 'Enforcers', 'Falcons', 'Fire Starters', 'Force', 'Formation', 'Frames', 'Ghosts', 'Grashers', 'Griffins', 'Hammer', 'Hoplites', 'Hunters', 'Hutch Bunnies', 'Infantry', 'Jaguars', 'Knights', 'Lancers', 'Legion', 'Legionnaires', 'Lobsters', 'Marauders', 'Marines', 'Mercenaries', 'Militia', 'Miners', 'Nagas', 'Navigators', 'Outlaws', 'Overlords', 'Peacekeepers', 'Phalanx', 'Pirates', 'Pitbulls', 'Police', 'Protectors', 'Raiders', 'Rangers', 'Ravens', 'Rebels', 'Recon', 'Rejects', 'Rhinos', 'Ronin', 'Rustbuckets', 'Scorpions', 'Scouts', 'Scythe', 'Seals', 'Sentinels', 'Seraphs', 'Service', 'Shadows', 'Sharks', 'Shield', 'Sisterhood', 'Slackers', 'Slag', 'Snakes', 'Soldiers', 'Squadron', 'Standing Tanks', 'Storm', 'Striders', 'Strike Team', 'SWAT Team', 'Sword', 'Tarantulas', 'Team', 'Thunderhead', 'Tigers', 'Troopers', 'Vagrants', 'Vikings', 'Vipers', 'Warriors', 'Wedge', 'Wolverines'];
		return randName = list1[Math.floor((Math.random() * (list1.length)))] + ' ' + list2[Math.floor((Math.random() * (list2.length)))];
	},
	generateDescriptor: function() {
		var newName = this.randomTeamName();
		var newColor = '#'+pad(Math.floor(Math.random()*16777215).toString(16), 6);

		return descriptor = [newName, newColor];
	},
	updateActiveTeams: function(thisGame) {
		thisGame.sortByScore();

		$('#active-game-teams').empty();

		for (var i in thisGame.teams) {
			var teamrow = '';

			teamrow = '<div class="team" data-team-index="'+ i + '">';

			teamrow += '<ul class="team-box" data-role="listview" data-inset="true"><li class="team-info">';

			teamrow += '<div class="team-score"><div class="score">' + thisGame.teams[i].gScore + '</div>';
			teamrow += '<small class="PPA">' + thisGame.teams[i].gPPA + ' PPA</small></div>';

			teamrow += '<div class="team-asset-summary">' + mfzch.getIcon('frame', thisGame.teams[i].color, 'game-icon') + thisGame.teams[i].gFrames + '<br />';
			teamrow += mfzch.getIcon('station', thisGame.teams[i].color, 'game-icon') + thisGame.teams[i].gStations + '</div>';

			teamrow += '<div class="team-name"><h2>' + thisGame.teams[i].name + '</h2></div></li>';

			if (thisGame.trackingLevel >= 20
				&& thisGame.teams[i].cProfile) {

				for (var j in thisGame.teams[i].cFrames) {
					teamrow += '<li class="team-frame';

					if (thisGame.trackingLevel >= 30) {
						if (thisGame.teams[i].cFrames[j].activated) {
							teamrow += ' activated" data-theme="c';
						}
					}

					teamrow += '" data-frameid="' + j + '"><a href="#" data-rel="popup" data-position-to="window" data-transition="pop" class="frame-smash">';

					teamrow += '<span class="lv-wsys-name">';

					if (thisGame.trackingLevel >= 30) {
						if (thisGame.teams[i].cFrames[j].activated) {
							teamrow += '<span data-sys="b">' + thisGame.teams[i].cFrames[j].defense + '</span>';
						}
						if (thisGame.teams[i].cFrames[j].spot > 0) {
							teamrow += '<span data-sys="y">' + thisGame.teams[i].cFrames[j].spot + '</span>';
						}
					}

					teamrow += mfzch.getIcon('frame', thisGame.teams[i].color, 'game-icon') + thisGame.teams[i].cFrames[j].name + '</span>';

					teamrow += thisGame.teams[i].cFrames[j].getSystemDisplay(false, true, 'in-list');

					teamrow += '</a></li>';
				}
				teamrow += '</ul>';
			}

			teamrow += '</div>';

			$('#active-game-teams').append(teamrow);
			$('#active-game-teams').find('.team-box').listview();
		}
	},
	updateSystemDisplay: function(thisFrame) {
		// system display
		$('#active-systems').html(thisFrame.getSystemDisplay(true, true));

		// dice display
		if(!thisFrame.rollResult) { // if no current roll exists
			$('#active-dice').html(thisFrame.getDiceDisplay());
		} else {
			$('#active-dice').html(thisFrame.getRollDisplay());
		}

		$('.framespec').html(thisFrame.createFrameGraph(true));
	},
	getCapturableStations: function(captureTeam, isGaining) {
		var availableStations = '';
		var availableStationIDs = [];

		if (isGaining) {
			$('.station-capture-message').html('Who controls the station that <strong>' + mfzch.getIcon('company', this.game.teams[captureTeam].color, 'game-icon') + this.game.teams[captureTeam].name + '</strong> is capturing?')

			for (var i in this.game.teams) {
				if (this.game.teams[i].gStations) {
					if (i != captureTeam) {
						if (this.game.teams[i].gStations) {
							availableStationIDs.push(i);
							availableStations += '<li data-icon="minus"><a href="#" class="station-capture-button" data-team-index="' + i + '">' + mfzch.getIcon('company', this.game.teams[i].color, 'game-icon') + this.game.teams[i].name + ' <span class="ui-li-count">' + this.game.teams[i].gStations + '</span></a></li>';
						}
					}
				}
			}
			if(this.game.unclaimedStations) {
				availableStationIDs.push('nobody');
				availableStations += '<li data-icon="minus"><a href="#" class="station-capture-button" data-team-index="nobody">Unclaimed <span class="ui-li-count">' + this.game.unclaimedStations + '</span></a></li>';
			}

		} else {
			$('.station-capture-message').html('Who is gaining control of the station <strong>' + mfzch.getIcon('company', this.game.teams[captureTeam].color, 'game-icon') + this.game.teams[captureTeam].name + '</strong> is losing?')

			for (var i in this.game.teams) {
				if (i != captureTeam && this.game.teams[i].gFrames) {
					availableStationIDs.push(i);
					availableStations += '<li data-icon="plus"><a href="#" class="station-drop-button" data-team-index="' + i + '">' + mfzch.getIcon('company', this.game.teams[i].color, 'game-icon') + this.game.teams[i].name + ' <span class="ui-li-count">' + this.game.teams[i].gStations + '</span></a></li>';
				}
			}
			if (mfzch.game.checkUnclaimedIsPossible()) {
				availableStations += '<li data-icon="plus"><a href="#" class="station-drop-button" data-team-index="nobody">Nobody/Contested <span class="ui-li-count">' + this.game.unclaimedStations + '</span></a></li>';
			}
		}

		if (availableStationIDs.length == 1) {
			return availableStationIDs[0];
		} else if (availableStations) {
			$('#station-capture-list').html(availableStations);
			$('#station-capture-list').listview('refresh');
			$('#station-capture-list').show();
			return false;
		} else {
			$('.station-capture-message').html('There are no stations which <strong>' + mfzch.getIcon('company', this.game.teams[captureTeam].color, 'game-icon') + this.game.teams[captureTeam].name + '</strong> may capture.');

			$('#station-capture-list').hide();
			return false;
		}
	},
	getCompanyListForLoadouts: function(){
		var output = '';
		for (var i in this.companies) {
			if (this.companies[i].frames.length < MAXFRAMES) {
				output += '<li data-id="' + i + '" data-icon="false"><a href="#">' + mfzch.getIcon('company', this.companies[i].color, 'game-icon') + this.companies[i].name + '<span class="ui-li-count">' + this.companies[i].frames.length + '</span></a></li>';
			} else {
				output += '<li data-id="' + i + '">' + mfzch.getIcon('company', this.companies[i].color, 'game-icon') + this.companies[i].name + '<span class="ui-li-count">Full</span></li>';
			}
		}
		return output;
	},
	updateLoadoutList: function() {
		$('#loadouts-custom').empty();
		var loadoutList = '<ul data-role="listview" data-split-icon="delete" data-inset="true">';

		for (var i in this.loadouts) {
			loadoutList += '<li data-load-id="' + i + '"><a href="#loadout-adjust" data-rel="popup" data-position-to="window" data-transition="pop" class="load-manage">';
			loadoutList += '<span class="lv-wsys-name">' + this.loadouts[i].name + '</span>';
			loadoutList += this.loadouts[i].getSystemDisplay(false, false, 'in-list no-ssr');
			loadoutList += '</a><a href="#" class="load-del">Delete</a></li>';
		}
		if (this.loadouts.length < MAXLOADOUTS) {
			loadoutList += '<li><a href="#" id="loadout-add" class="ui-btn ui-icon-plus ui-btn-icon-left">Add Loadout</a></li>';
		}
		loadoutList += '</ul>';

		$('#loadouts-custom').html(loadoutList);
		$('#loadouts-custom>ul').listview();
	},
	getTeamListForUnitStrucutre: function (){
		var output = '';
		for (var i in this.game.teams) {
			output += '<li data-id="' + i + '" data-icon="minus"><a href="#">' + mfzch.getIcon('company', this.game.teams[i].color, 'game-icon', true) + this.game.teams[i].name + '<span class="ui-li-count">' + this.game.teams[i].gFrames + '/' + this.game.teams[i].sSystems + '</span></a></li>';
		}
		return output;

	},
	updateCompanyList: function() {
		$('#company-list').empty();

		for (var i in this.companies) {
			var companyList = '<li id="company_'+ i +'" data-companyid="' + i + '">'

			+ '<ul data-role="listview" data-split-icon="delete" data-inset="true" class="company-frames">'

			+ '<li data-theme="b"><a href="#company-adjust" data-rel="popup" data-position-to="window" data-transition="pop" class="company-manage" class="company-info">' + '<span class="lv-wsys-name">' + mfzch.getIcon('company', this.companies[i].color, 'game-icon', true) + this.companies[i].name + '</span><ul class="companyinfo-string in-list">';

			companyList += '<li>' + mfzch.getIcon('frame', this.companies[i].color, 'game-icon') + this.companies[i].frames.length + '</li>';
			companyList += '<li>' + mfzch.getIcon('system', this.companies[i].color, 'game-icon') + this.companies[i].totalSystems() + '</li>';
			companyList += '<li><span data-sys="ssr">SSR</span>' + this.companies[i].totalSSRs()+ '</li>';

			companyList += '</ul></a>';

			companyList += '<a href="#" class="company-delete">Delete</a>';

			if (this.companies[i].frames.length) {
				companyList += '<li data-role="list-divider" class="company-graph-in-list">' + this.companies[i].getCompanyGraph() + '</li>';
			}

			for (var j in this.companies[i].frames) {
				companyList += '<li data-frameid="' + j + '"><a href="#frame-adjust" data-rel="popup" data-position-to="window" data-transition="pop" class="frame-manage">';

				companyList += '<span class="lv-wsys-name">' + mfzch.getIcon('frame', this.companies[i].color, 'game-icon') + this.companies[i].frames[j].name + '</span>';

				companyList += this.companies[i].frames[j].getSystemDisplay(false, false, 'in-list');

				companyList += '</a><a href="#" class="frame-del">Delete</a></li>';
			}

			if (this.companies[i].frames.length < MAXFRAMES) {
				companyList += '<li><a href="#" class="frame-add ui-btn ui-btn-a ui-icon-plus ui-btn-icon-left">Add Frame</a></li>';
			}

			companyList += '</ul></li>';
			$('#company-list').append(companyList);
		}

		if (this.companies.length < MAXCOMPANIES) {
			$('#company-list').append('<li><a href="#" id="company-add" class="ui-btn ui-btn-a ui-corner-all ui-icon-plus ui-btn-icon-left">Add Company</a></li>');
		}

		$('.company-frames').listview();

		if (!mfzch.settings.showUnitGraphs) {
			$('.company-graph-in-list').hide();
		}
	},

	/* Deployment */

	frameNameScore: function(teamid) {
		return mfzch.getIcon('company', this.game.teams[teamid].color, 'game-icon') + this.game.teams[teamid].name + ' &#8212; ' + this.game.teams[teamid].gScore + ' <small>(' + this.game.teams[teamid].gPPA + 'PPA)</small>';
	},
	frameName: function(teamid) {
		return mfzch.getIcon('company', this.game.teams[teamid].color, 'game-icon') + this.game.teams[teamid].name;
	},

	/* Loadouts */

	extractLoadoutFromTitle: function(elInput, elOutput) {
		var name = $(elInput).parent().parent().find('.lv-wsys-name').html().trim();
		$(elOutput).attr('data-name', name);

		$(elOutput).html($(elInput).parent().parent().find('a .sys-display').html());
	},
	convertHtmlToLoadout: function(elInput) {
		var load = new frameModel;

		load.name = $(elInput).attr('data-name');
		$(elInput).find('li').each(function(){
			var sysType = $(this).attr('data-sys');
			load[sysType]++;
		});

		return load;
	},

	/* Structured Units */

	addCompanyToAsset: function() {
		var companyid = $('#company-index').val();

		var team = new teamModel();
		team.name = uniqueName(this.companies[companyid].name, buildNameArray(this.game.teams));
		team.cProfile = true;
		team.cNonstandard = this.companies[companyid].nonstandard;

		team.color = this.companies[companyid].color;
		team.gFrames = this.companies[companyid].frames.length;
		team.sSystems = this.companies[companyid].totalSystems();

		 // Copy frames in
		for (var i in this.companies[companyid].frames) {
			team.cFrames[i] = new frameModel();
			for (var j in this.companies[companyid].frames[i]) {
				team.cFrames[i][j] = this.companies[companyid].frames[i][j];
			}
		}

		this.game.teams.push(team);
		mfzch.saveData(this.game, 'mfz.game');

		$('#company-track-added').popup('open');
		try {
			ga('send', 'event', 'Company', 'Action', 'Send to Asset Tracker', 0, false);
		} catch (err) {}
	}
}

/* ---------------------- */
/* globals */

// "constants"
var MAXBTFRAMES = [0, 0, 8, 7, 6, 5];
var MINBTFRAMES = [0, 0, 5, 4, 4, 3];
var MAXSKFRAMES = [0, 0, 6, 5, 4, 4];
var MINSKFRAMES = [0, 0, 4, 3, 3, 3];
var NUMSTATIONS = [0, 0, 3, 2, 2, 1];
var MEAND6D8 = [ // mean (highest of Xd6 + Yd8)
	[0, 4.5, 5.81, 6.47, 6.86],
	[3.5, 5.23, 6.09, 6.59, 6.92],
	[4.47, 5.59, 6.25, 6.67, 6.96],
	[4.96, 5.81, 6.35, 6.72, 6.99],
	[5.24, 5.95, 6.42, 6.76, 7.01],
	[5.43, 6.05, 6.48, 6.79, 7.03],
	[5.56, 6.12, 6.52, 6.81, 7.04]
]
var MAXCOMPANIES = 20;
var MAXTEAMS = 5;
var MAXFRAMES = 8;
var MAXLOADOUTS = 50;
var BUILDVERSION = 2015042301;
var PUBLICBUILDSTRING = 'v2015.04.23';

/* ---------------------- */
/* App setup */

// main vars
mfzch.game = mfzch.restoreData('mfz.game', 'game');
mfzch.templateGame = mfzch.restoreData('mfz.templateGame', 'templateGame');
mfzch.frameSet = mfzch.restoreData('mfz.diceSim', 'sim');
mfzch.companies = mfzch.restoreData('mfz.companies', 'companies');
mfzch.loadouts = mfzch.restoreData('mfz.loadouts', 'loadouts');
mfzch.settings = mfzch.restoreData('mfz.settings', 'settings');

if(mfzch.settings.saveVersion == 2) { // legacy game format (2014.09.19)
	mfzch.game = new gameModel();
	mfzch.settings.saveVersion = 3;
	mfzch.saveData(mfzch.settings, 'mfz.settings');
}

$(document).on('submit', 'form', function(event){ // kill all HTML form submits
	event.preventDefault();
});

$(document).ready(function(){
	window.applicationCache.update();
	$('#version').html(PUBLICBUILDSTRING);

	if(mfzch.settings.buildVersion < BUILDVERSION) {
		if (!mfzch.settings.buildVersion) {
			try {
				ga('send', 'event', 'App', 'New Load', BUILDVERSION, 1, true);
			} catch (err) {}
		} else {
			try {
				ga('send', 'event', 'App', 'Update from', mfzch.settings.buildVersion, 1, true);
				ga('send', 'event', 'App', 'Update to', BUILDVERSION, 1, true);
			} catch (err) {}
		}

		mfzch.settings.buildVersion = BUILDVERSION;
		mfzch.saveData(mfzch.settings, 'mfz.settings');
	} else {
		try {
			ga('send', 'event', 'App', 'Run', BUILDVERSION, 1, true);
		} catch (err) {}
	}
});

// notify of available update
$(window.applicationCache).on('updateready', function(e) {
	if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
	    $('#update-ready').slideDown();
	}

	$(document).on('click', '#do-update', function(){
		window.applicationCache.swapCache();
		window.location.reload();
	});

	$(document).on('click', '#no-update', function(){
		$('#update-ready').slideUp();
	});
});

// Load the side-panel var to the DOM / page
$(document).one('pagebeforecreate', function () {
	$.mobile.pageContainer.prepend(mfzch.buildNavPanel());
	$("#nav-panel").panel();
	$('.nav-listview').listview();

	if (mfzch.settings.compactUI) {
		$('body').addClass('compact-ui');
	}
});

$( document ).on( "pagecreate", function() {
	// swipe menu open
	$( document ).on( "swiperight", function( e ) {
		if ( $( ".ui-page-active" ).jqmData( "panel" ) !== "open"
			 && $(".ui-page-active .ui-popup-active").length <= 0) {
			$( "#nav-panel" ).panel( "open" );
		}
	});

	// prevent menu swipe on sliders
	$(document).on('swiperight', '[data-role=slider]', function(ev){
		ev.stopPropagation();
	});
});

$(document).on('pagecreate', '#main-page', function(event){
	$('#main-nav').html(mfzch.buildNav()).enhanceWithin();
});

$(document).on("pagecontainerbeforeshow", function(event, ui){
	if(mfzch.settings.enableSplitSystems) {
		$('[data-sys-split=true]').show();
	} else {
		$('[data-sys-split=true]').hide();
	}

	/* *** */
	if(mfzch.settings.enableEnvironmental) {
		$('[data-sys-env=true]').show();
	} else {
		$('[data-sys-env=true]').hide();
	}
});

/* ---------------------- */

/* Team Setup */

$(document).on('pagecreate', '#team_setup', function(event){
	// add team
	$(document).on('click', '#team-add', function(){
		var team = new teamModel();

		var teamDesc = mfzch.generateDescriptor();

		team.name = teamDesc[0];
		team.color = teamDesc[1];

		mfzch.game.teams.push(team);
		mfzch.saveData(mfzch.game, 'mfz.game');

		mfzch.updateTeamList(mfzch.game);
		mfzch.updateSetupParameters(mfzch.game);

		var teamid = mfzch.game.teams.length-1;
		var team = mfzch.game.teams[teamid];

		$('#team-index').val(teamid);
		$('#team-name').val(team.name);
		$('#team-color').val(team.color);
		$('#team-frames').val(team.gFrames).slider( "refresh" );
		$('#team-systems').val(team.sSystems).slider( "refresh" );

		if(mfzch.game.teams[teamid].cProfile) {
			$('#team-adjust-profiled').show();
		} else {
			$('#team-adjust-profiled').hide();
		}

		mfzch.updateSystemsInputs();

		$('#team-adjust').popup('open');
	});

	// delete team
	$(document).on('click', '.team-del', function(){
		var teamid = $(this).parent().attr('data-teamid');
		mfzch.game.teams.splice(teamid, 1);
		mfzch.saveData(mfzch.game, 'mfz.game');

		$('#teams [data-teamid=' + teamid + ']').slideUp(function(){
			mfzch.updateTeamList(mfzch.game);
		});

		mfzch.updateSetupParameters(mfzch.game);
	});

	// manage team
	$(document).on('click', '.team-manage', function(){
		var teamid = $(this).parent().attr('data-teamid');
		var team = mfzch.game.teams[teamid];

		$('#team-index').val(teamid);
		$('#team-name').val(team.name);
		$('#team-color').val(team.color);
		$('#team-frames').val(team.gFrames).slider( "refresh" );
		$('#team-systems').val(team.sSystems).slider( "refresh" );

		mfzch.updateSystemsInputs();
	});

	$(document).on('focus', '#team-name', function(){
		this.select();
	});

	$(document).on('focus', '#team-frames', function(){
		this.select();
	});

	$(document).on('focus', '#team-systems', function(){
		this.select();
	});

	// team regen name/color
	$(document).on('click', '#team-regen', function(){
		var teamid = $('#team-index').val();
		var team = mfzch.game.teams[teamid];

		var teamDesc = mfzch.generateDescriptor();
		team.name = teamDesc[0];
		team.color = teamDesc[1];

		$('#team-name').val(team.name);
		$('#team-color').val(team.color);
	});

	// set team options
	$(document).on('click', '#team-submit', function(){
		var teamid = $('#team-index').val();

		var bork = $('#team-name').val();
		mfzch.game.teams[teamid].name = $('<div/>').text(bork).html();

		mfzch.game.teams[teamid].color = $('#team-color').val();

		if (mfzch.game.teams[teamid].gFrames != parseInt($('#team-frames').val())
			|| mfzch.game.teams[teamid].sSystems != parseInt($('#team-systems').val())) {
			mfzch.game.teams[teamid].gFrames = parseInt($('#team-frames').val());
			mfzch.game.teams[teamid].sSystems = parseInt($('#team-systems').val());
			mfzch.game.teams[teamid].cProfile = false;
		}

		mfzch.saveData(mfzch.game, 'mfz.game');
		mfzch.updateTeamList(mfzch.game);
		mfzch.updateSetupParameters(mfzch.game);

		$('#team-adjust').popup('close');
	});

	// manage the team dialog
	$(document).on('change', '#team-frames', function(){
		mfzch.updateSystemsInputs();
	});

	// game type switch
	$(document).on('change', '#game-type-switch', function(){
		mfzch.game.gameType = $('#game-type-switch').val();
		mfzch.updateSetupParameters(mfzch.game);
	})

	// tracking level switch
	$(document).on('change', '#game-tracking-level', function(){
		mfzch.game.trackingLevel = $('#game-tracking-level').val();
	})

	// game checks before proceeding
	$(document).on('click', '#game-start', function(){
		mfzch.game.reset();

		if (mfzch.game.gameType == "Demo/Free") {
			$('#game-parameters').popup('open');
		} else {
			if (!mfzch.game.frameCountIsGood()) { // check min/max frames against game type
				$('#setup_framecount').popup('open');
				try {
					ga('send', 'event', 'Game', 'Setup', 'Frame Number', 0, false);
				} catch (err) {}

			} else if (mfzch.game.tiedForDefense()) { // check for defensive tie
				$('#setup_tie').popup('open');
				try {
					ga('send', 'event', 'Game', 'Setup', 'Defensive Tie', 0, false);
				} catch (err) {}

			} else {
				mfzch.saveData(mfzch.game, 'mfz.game');

				if (mfzch.game.trackingLevel >= 20) {
					for (var i in mfzch.game.teams) {
						if (!mfzch.game.teams[i].cProfile) {
							mfzch.game.trackingLevel = 10;
							break;
						}
					}
				}

				$('#deploy-allteams').empty();
				for (var i in mfzch.game.teams) {
					if (parseInt(i) == 0) {
						$('#deploy-allteams').append('<li>Defense: <strong>' + mfzch.frameNameScore(i) + '</strong></li>')
					} else if (parseInt(i) == mfzch.game.teams.length-1) {
						$('#deploy-allteams').append('<li>Point Offense: <strong>' + mfzch.frameNameScore(i) + '</strong></li>')
					} else {
						$('#deploy-allteams').append('<li>Offense: <strong>' + mfzch.frameNameScore(i) + '</strong></li>')
					}
				}

				if(mfzch.game.teams.length > 3) {
					$('.deploy-attackers').empty();
					for (var i in mfzch.game.teams) {
						if (parseInt(i)) {
							$('.deploy-attackers').append('<li><strong>' + mfzch.frameName(i) + '</strong></li>')
						}
					}
					$('.multiple-offense').show();
				} else {
					$('.multiple-offense').hide();
				}

				$('.deploy-defender').html(mfzch.frameName(0));
				$('.deploy-point').html(mfzch.frameName(mfzch.game.teams.length-1));

				$( ":mobile-pagecontainer" ).pagecontainer( "change", "#game-deployment", { changeHash: false } );
			}
		}
	});

	$(document).on('click', '#gp-submit', function(){
		mfzch.game.doomsday = parseInt($('#gp-doomsday').val());
		mfzch.game.stationsPerPlayer = parseInt($('#gp-stationsPerPlayer').val());
		mfzch.game.unclaimedStations = parseInt($('#gp-unclaimedStations').val());

		for (var i in mfzch.game.teams) {
			// reset number of stations
			mfzch.game.teams[i].gStations = mfzch.game.stationsPerPlayer;
		}
		mfzch.game.updateScores();

		$( ":mobile-pagecontainer" ).pagecontainer( "change", "#active-game", { changeHash: false } );
	});

	$(document).on('click', '#gp-cancel', function(){
		$('#game-parameters').popup('close');
	});

	$(document).on('click', '#setup-framecount-back', function(){
		$('#setup_framecount').popup('close');
	});

	$(document).on('click', '#setup-tie-back', function(){
		$('#setup_tie').popup('close');
	});

	$(document).on('click', '#game-deployment-back', function(){
		$( ":mobile-pagecontainer" ).pagecontainer( "change", "#team_setup", { changeHash: false } );
	});

	$(document).on('click', '.play-combat-phase', function(){
		$( ":mobile-pagecontainer" ).pagecontainer( "change", "#active-game", { changeHash: false } );
	});
});

$(document).on("pagecontainerbeforechange", function(event, data){
	if (data.toPage[0].id == 'team_setup') { // auto switch to correct panel
		if (mfzch.game.inProgress) {
			data.toPage[0] = $("#active-game")[0];
		}
	}
});

$(document).on("pagecontainerbeforeshow", function(event, ui){
	if (ui.toPage[0].id == 'team_setup') {

		$('#game-type-switch').val(mfzch.game.gameType).selectmenu('refresh');
		$('#game-tracking-level').val(mfzch.game.trackingLevel).selectmenu('refresh');

		if (mfzch.game.inProgress){
			$( ":mobile-pagecontainer" ).pagecontainer( "change", "#active-game", { changeHash: false } );
		}

		mfzch.updateSetupParameters(mfzch.game);
		mfzch.updateTeamList(mfzch.game);
		mfzch.updateSystemsInputs();
	}
});

/* ---------------------- */
/* Combat Phase */

$(document).on('pagecreate', '#active-game', function(event){
	// open team actions
	$(document).on('click', '.team-info', function(){
		if (!mfzch.game.gameEnded) {
			var teamid = $(this).parent().parent().attr('data-team-index');
			$('#team-action').attr('data-team-index', teamid).popup('option', 'afterclose', '');

			var actions = mfzch.game.getActions(teamid);

			if (!actions.length){
				$('#no-action').popup('open');
			} else {
				$('#destroy-frame').hide();
				$('#gain-station').hide();
				$('#lose-station').hide();

				for (var i in actions) {
					if (actions[i] == 'frame') {
						$('#destroy-frame').show();
					} else if (actions[i] == 'station-capture') {
						$('#gain-station').show();
					} else if (actions[i] == 'station-drop') {
						$('#lose-station').show();
					}
				}

				$('#team-action>ul').listview('refresh');
				$('#team-action').popup('open', {positionTo: this});
			}
		}
	});

	// destroy frame option
	$(document).on('click', '#destroy-frame', function(){
		var teamid = $('#team-action').attr('data-team-index');

		if(mfzch.game.teams[teamid].gFrames) {
			mfzch.undo.setState(mfzch.game);
			mfzch.game.teams[teamid].gFrames--;
			mfzch.game.logEvent(mfzch.game.teams[teamid].name + ' loses a frame');
			mfzch.game.updateScores();
			mfzch.updateActiveTeams(mfzch.game);
			mfzch.game.logScores('short');
			mfzch.saveData(mfzch.game, 'mfz.game');

			mfzch.settings.framesDestroyed++;
			mfzch.saveData(mfzch.settings, 'mfz.settings');

			try {
				ga('send', 'event', 'Game', 'Action', 'Destroyed Frame', 0, false);
			} catch (err) {}
		}

		$('#team-action').popup('close');
		mfzch.game.checkEarlyDoomsday();
	});

	// gain station option
	$(document).on('click', '#gain-station', function(){
		var teamid = $('#team-action').attr('data-team-index');
		var autoSelect = mfzch.getCapturableStations(teamid, true);

		if (autoSelect) {
			var capturedFrom = '';

			mfzch.undo.setState(mfzch.game);
			if (autoSelect == 'nobody') {
				mfzch.game.unclaimedStations--;
				capturedFrom = ' claims a contested station';
			} else {
				mfzch.game.teams[autoSelect].gStations--;
				capturedFrom = ' captures a station from ' + mfzch.game.teams[autoSelect].name;
			}
			mfzch.game.teams[teamid].gStations++;
			mfzch.game.logEvent(mfzch.game.teams[teamid].name + capturedFrom);
			mfzch.game.updateScores();
			mfzch.updateActiveTeams(mfzch.game);
			mfzch.game.logScores('short');
			mfzch.saveData(mfzch.game, 'mfz.game');

			$('#team-action').popup('close');
			try {
				ga('send', 'event', 'Game', 'Action', 'Station Captured', 0, false);
			} catch (err) {}

		} else {
			$('#team-action').popup('option', 'afterclose', function(){
				$('#station-capture').popup('open');
			});
			$('#team-action').popup('close');
		}
		mfzch.game.checkEarlyDoomsday();
	});

	// lose station option
	$(document).on('click', '#lose-station', function(){
		var teamid = $('#team-action').attr('data-team-index');
		var autoSelect = mfzch.getCapturableStations(teamid, false);
		if (autoSelect) {
			var capturedFrom = '';

			mfzch.undo.setState(mfzch.game);
			mfzch.game.teams[autoSelect].gStations++;
			mfzch.game.logEvent(mfzch.game.teams[autoSelect].name + ' captures a station from ' + mfzch.game.teams[teamid].name);

			mfzch.game.teams[teamid].gStations--;
			mfzch.game.updateScores();
			mfzch.updateActiveTeams(mfzch.game);
			mfzch.game.logScores('short');
			mfzch.saveData(mfzch.game, 'mfz.game');

			$('#team-action').popup('close');
			try {
				ga('send', 'event', 'Game', 'Action', 'Station Captured', 0, false);
			} catch (err) {}
		} else {
			$('#team-action').popup('option', 'afterclose', function(){
				$('#station-capture').popup('open');
			});
			$('#team-action').popup('close');
		}
		mfzch.game.checkEarlyDoomsday();
	});

	// capture station
	$(document).on('click', '.station-capture-button', function(){
		var capturingTeamid = $('#team-action').attr('data-team-index');
		var capturedTeamid = $(this).attr('data-team-index');
		var capturedFrom = '';

		mfzch.undo.setState(mfzch.game);
		if (capturedTeamid == 'nobody') {
			mfzch.game.unclaimedStations--;
			capturedFrom = ' claims a contested station';
		} else {
			mfzch.game.teams[capturedTeamid].gStations--;
			capturedFrom = ' captures a station from ' + mfzch.game.teams[capturedTeamid].name;
		}
		mfzch.game.teams[capturingTeamid].gStations++;
		mfzch.game.logEvent(mfzch.game.teams[capturingTeamid].name + capturedFrom);
		mfzch.game.updateScores();
		mfzch.updateActiveTeams(mfzch.game);
		mfzch.game.logScores('short');
		mfzch.saveData(mfzch.game, 'mfz.game');

		$('#station-capture').popup('close');
		try {
			ga('send', 'event', 'Game', 'Action', 'Station Captured', 0, false);
		} catch (err) {}

		mfzch.game.checkEarlyDoomsday();
	});

	// drop station
	$(document).on('click', '.station-drop-button', function(){
		var capturedTeamid = $('#team-action').attr('data-team-index');
		var capturingTeamid = $(this).attr('data-team-index');
		var capturedFrom = '';

		mfzch.undo.setState(mfzch.game);
		if (capturingTeamid == 'nobody') {
			mfzch.game.unclaimedStations++;
			mfzch.game.logEvent(mfzch.game.teams[capturedTeamid].name + ' loses a station which becomes contested');
		} else {
			mfzch.game.teams[capturingTeamid].gStations++;
			mfzch.game.logEvent(mfzch.game.teams[capturingTeamid].name + ' captures a station from ' + mfzch.game.teams[capturedTeamid].name);
		}
		mfzch.game.teams[capturedTeamid].gStations--;
		mfzch.game.updateScores();
		mfzch.updateActiveTeams(mfzch.game);
		mfzch.game.logScores('short');
		mfzch.saveData(mfzch.game, 'mfz.game');

		$('#station-capture').popup('close');
		try {
			ga('send', 'event', 'Game', 'Action', 'Station Captured', 0, false);
		} catch (err) {}

		mfzch.game.checkEarlyDoomsday();
	});

	// undo
	$(document).on('click', '#undo', function(){
		mfzch.undo.getState(mfzch.game);
		mfzch.game.updateScores();
		mfzch.updateActiveTeams(mfzch.game);
		mfzch.updateGameInfo(mfzch.game);
		mfzch.saveData(mfzch.game, 'mfz.game');
	});

	// redo
	$(document).on('click', '#redo', function(){
		mfzch.undo.getRedoState(mfzch.game);
		mfzch.game.updateScores();
		mfzch.updateActiveTeams(mfzch.game);
		mfzch.updateGameInfo(mfzch.game);
		mfzch.saveData(mfzch.game, 'mfz.game');
	});

	// end round
	$(document).on('click', '#end-round', function(){
		mfzch.undo.setState(mfzch.game);

		mfzch.game.doomsday--;
		$('.gameinfo-doomsday-counter').html(mfzch.game.doomsday);

		if (mfzch.game.trackingLevel >= 30) {
			for (var i in mfzch.game.teams) {
				for (var j in mfzch.game.teams[i].cFrames) {
					mfzch.game.teams[i].cFrames[j].activated = false;
					mfzch.game.teams[i].cFrames[j].defense = 0;
					mfzch.game.teams[i].cFrames[j].spot = 0;
				}
			}
			mfzch.updateActiveTeams(mfzch.game);
		}

		mfzch.game.logEvent('Round ' + (mfzch.game.round) + ' ends; Doomsday is now '+ mfzch.game.doomsday);
		mfzch.game.logSeparator();

		if (mfzch.game.doomsday < 1) {
			mfzch.game.endGame();
		} else {
			mfzch.game.round++;

			$('#ddc-current-team').html(mfzch.getIcon('company', mfzch.game.teams[0].color, 'game-icon') + mfzch.game.teams[0].name);
			$('#ddc-count').attr('data-team-index', 0);

			$('#ddc-count').popup('option', 'afterclose', function(){
				setTimeout(function(){
					if (mfzch.game.doomsday > 0) {

						var teamIndex = $('#ddc-count').attr('data-team-index');

						if (teamIndex < mfzch.game.teams.length-1) {
							$('.gameinfo-doomsday-counter').html(mfzch.game.doomsday);
							teamIndex++;
							$('#ddc-current-team').html(mfzch.getIcon('company', mfzch.game.teams[teamIndex].color, 'game-icon') + mfzch.game.teams[teamIndex].name);
							$('#ddc-count').attr('data-team-index', teamIndex);
							$('#ddc-count').popup('open');
						} else {
							mfzch.updateGameInfo(mfzch.game);
							mfzch.game.logEvent('Doomsday is now '+ mfzch.game.doomsday);
							mfzch.game.logSeparator();
							mfzch.game.logEvent('Round '+ mfzch.game.round + ' begins');
							mfzch.game.logScores();
							mfzch.saveData(mfzch.game, 'mfz.game');
						}
					} else {
						mfzch.game.logEvent('Doomsday is now 0');
						mfzch.game.endGame();
					}
				}, 1); // I guess it doesn't fire after it COMPLETELY closes...
			} );
			$('#ddc-count').popup('open');
		}
	});

	$(document).on('click', '#ddc-yes', function(){
		mfzch.game.doomsday--;
		mfzch.game.logEvent(mfzch.game.teams[$('#ddc-count').attr('data-team-index')].name + ' counts down doomsday');
		$('#ddc-count').popup('close');
	});

	$(document).on('click', '#ddc-no', function(){
		mfzch.game.logEvent(mfzch.game.teams[$('#ddc-count').attr('data-team-index')].name + ' does not count down doomsday');
		$('#ddc-count').popup('close');
	});

	$(document).on('click', '#log-btn', function(){
		$('#game-log').html(mfzch.game.log);
		$('#game-log-box').popup('open');
	});

	$(document).on('click', '#endgame-log', function(){
		$('#game-log').html(mfzch.game.log);
		$('#game-log-box').popup('open');
	});

	$(document).on('click', '#game-log-copy', function(){
		selectText('game-log');
		try {
			ga('send', 'event', 'Game', 'Action', 'Select Log', 0, false);
		} catch (err) {}
	});

	// exit game
	$(document).on('click', '#exit-game', function(){
		$('#confirm-exit-game').popup('open');
	});

	$(document).on('click', '#newgame-yes', function(){
		mfzch.game.inProgress = false;
		mfzch.game.restoreFromTemplate();
		mfzch.saveData(mfzch.game, 'mfz.game');
		$( ":mobile-pagecontainer" ).pagecontainer( "change", "#team_setup", { changeHash: false } );
	});

	$(document).on('click', '#newgame-no', function(){
		$('#confirm-exit-game').popup('close');
	});

	// Tracking level 20+
	// manage frame
	$(document).on('click', '.frame-smash', function(){
		if (!mfzch.game.gameEnded) {
			var companyid = $(this).parent().parent().parent().attr('data-team-index');
			var frameid = $(this).parent().attr('data-frameid');

			$('#company-smash-index').val(companyid);
			$('#frame-smash-index').val(frameid);
			$('#frame-smash-name').html(mfzch.getIcon('frame', mfzch.game.teams[companyid].color, 'game-icon') + mfzch.game.teams[companyid].cFrames[frameid].name);
			$('#frame-smash-systems').html(mfzch.game.teams[companyid].cFrames[frameid].getSystemDisplay(false, true));

			// Tracking level 30+
			if (mfzch.game.trackingLevel >= 30) {
				if (mfzch.game.teams[companyid].cFrames[frameid].activated) {
					$('#frame-smash-activate').hide();
					$('#frame-smash-def-set').show();
				} else {
					$('#frame-smash-activate').show();
					$('#frame-smash-def-set').hide();
				}
				$('#frame-smash-activated').checkboxradio('refresh');
				$('#frame-smash-defense').val(mfzch.game.teams[companyid].cFrames[frameid].defense).slider('refresh');
				$('#frame-smash-spot').val(mfzch.game.teams[companyid].cFrames[frameid].spot).slider('refresh');
			}

			$('#frame-smash').popup('open');
		}
	});

	// remove system
	$(document).on('click', '#frame-smash-systems li', function(){
		var companyid = $('#company-smash-index').val();
		var frameid = $('#frame-smash-index').val();
		var sysType = $(this).attr('data-sys');
		mfzch.undo.setState(mfzch.game);

		if(mfzch.game.teams[companyid].cFrames[frameid].removeSystem(sysType)) {
			if (sysType == 'ssr') {
				mfzch.game.logEvent(mfzch.game.teams[companyid].name + ' fires an SSR from '+ mfzch.game.teams[companyid].cFrames[frameid].name);
				try {
					ga('send', 'event', 'Game', 'Action', 'Fired SSR', 0, false);
				} catch (err) {}
			} else {
				mfzch.game.logEvent(mfzch.game.teams[companyid].name + ' loses a system (' + sysType + ') from '+ mfzch.game.teams[companyid].cFrames[frameid].name);
				try {
					ga('send', 'event', 'Game', 'Action', 'Destroyed System', 0, false);
				} catch (err) {}
			}
			mfzch.saveData(mfzch.game, 'mfz.game');

			mfzch.settings.systemsDestroyed++;
			mfzch.saveData(mfzch.settings, 'mfz.settings');

			$('#frame-smash-systems').html(mfzch.game.teams[companyid].cFrames[frameid].getSystemDisplay(false, true));
			mfzch.updateActiveTeams(mfzch.game);
		} else {
			mfzch.undo.invalidateLastState();
		}
	});
	// delete frame
	$(document).on('click', '#frame-smash-destroy', function(){
		var companyid = $('#company-smash-index').val();
		var frameid = $('#frame-smash-index').val();

		mfzch.undo.setState(mfzch.game);

		mfzch.game.logEvent(mfzch.game.teams[companyid].name + ' loses a frame: '+ mfzch.game.teams[companyid].cFrames[frameid].name);

		try {
			ga('send', 'event', 'Game', 'Action', 'Destroyed Frame', 0, false);
		} catch (err) {}

		$('#active-game-teams [data-team-index=' + companyid + '] [data-frameid=' + frameid + ']').slideUp(function(){
			mfzch.updateActiveTeams(mfzch.game);
		});

		mfzch.game.teams[companyid].cFrames.splice(frameid, 1);
		mfzch.game.teams[companyid].gFrames = mfzch.game.teams[companyid].cFrames.length;

		mfzch.game.updateScores();
		mfzch.game.logScores('short');
		mfzch.saveData(mfzch.game, 'mfz.game');

		mfzch.settings.framesDestroyed++;
		mfzch.saveData(mfzch.settings, 'mfz.settings');
		$('#frame-smash').popup('close');

		mfzch.game.checkEarlyDoomsday();
	});

	$(document).on('click', '#frame-smash-submit', function(){
		$('#frame-smash').popup('close');
	});

	// send to sim
	$(document).on('click', '#frame-smash-sim1', function(){
		var companyid = $('#company-smash-index').val();
		var frameid = $('#frame-smash-index').val();

		mfzch.frameNow = 1;
		jQuery.extend(mfzch.frameSet[1], mfzch.game.teams[companyid].cFrames[frameid]);

		try {
			ga('send', 'event', 'Game', 'Action', 'Send to Sim', 0, false);
		} catch (err) {}

		$( ":mobile-pagecontainer" ).pagecontainer( "change", "#dice-roller");

	});
	$(document).on('click', '#frame-smash-sim2', function(){
		var companyid = $('#company-smash-index').val();
		var frameid = $('#frame-smash-index').val();

		mfzch.frameNow = 2;
		jQuery.extend(mfzch.frameSet[2], mfzch.game.teams[companyid].cFrames[frameid]);

		try {
			ga('send', 'event', 'Game', 'Action', 'Send to Sim', 0, false);
		} catch (err) {}

		$( ":mobile-pagecontainer" ).pagecontainer( "change", "#dice-roller");
	});

	// Tracking level 30+
	$(document).on('click', '#frame-smash-activate', function(){
		mfzch.undo.setState(mfzch.game);

		var companyid = $('#company-smash-index').val();
		var frameid = $('#frame-smash-index').val();

		mfzch.game.teams[companyid].cFrames[frameid].activated = true;

		$('#frame-smash-def-set').show();
		$('#frame-smash-activate').hide();

		mfzch.game.logEvent(mfzch.game.teams[companyid].name + ' activates '+ mfzch.game.teams[companyid].cFrames[frameid].name);
		try {
			ga('send', 'event', 'Game', 'Action', 'Activation', 0, false);
		} catch (err) {}

		mfzch.saveData(mfzch.game, 'mfz.game');
		mfzch.updateActiveTeams(mfzch.game);
	});

	$(document).on('slidestop', '#frame-smash-defense', function(){
		mfzch.undo.setState(mfzch.game);

		var companyid = $('#company-smash-index').val();
		var frameid = $('#frame-smash-index').val();

		mfzch.game.teams[companyid].cFrames[frameid].defense = $('#frame-smash-defense').val();

		mfzch.game.logEvent(mfzch.game.teams[companyid].name + ' sets the defense of '+ mfzch.game.teams[companyid].cFrames[frameid].name + ' to ' + mfzch.game.teams[companyid].cFrames[frameid].defense);
		try {
			ga('send', 'event', 'Game', 'Action', 'Defense', mfzch.game.teams[companyid].cFrames[frameid].defense, false);
		} catch (err) {}

		mfzch.saveData(mfzch.game, 'mfz.game');
		mfzch.updateActiveTeams(mfzch.game);
	});

	$(document).on('slidestop', '#frame-smash-spot', function(){
		mfzch.undo.setState(mfzch.game);

		var companyid = $('#company-smash-index').val();
		var frameid = $('#frame-smash-index').val();

		mfzch.game.teams[companyid].cFrames[frameid].spot = $('#frame-smash-spot').val();;

		mfzch.game.logEvent(mfzch.game.teams[companyid].name + ' ' + mfzch.game.teams[companyid].cFrames[frameid].name + ' receives a spot of ' + mfzch.game.teams[companyid].cFrames[frameid].spot);
		try {
			ga('send', 'event', 'Game', 'Action', 'Defense', mfzch.game.teams[companyid].cFrames[frameid].spot, false);
		} catch (err) {}

		mfzch.saveData(mfzch.game, 'mfz.game');
		mfzch.updateActiveTeams(mfzch.game);
	});

});

$(document).on("pagecontainerbeforeshow", function(event, ui){
	if (ui.toPage[0].id == 'active-game') {
		if (!mfzch.game.teams.length){ // display correct panel
			$( ":mobile-pagecontainer" ).pagecontainer( "change", "#team_setup", { changeHash: false } );
		} else {
			mfzch.updateActiveTeams(mfzch.game);
			mfzch.updateGameInfo(mfzch.game);

			if (!mfzch.game.inProgress) {
				mfzch.templateGame = JSON.stringify(mfzch.game);

				mfzch.game.logEvent('Start Game');
				mfzch.game.logParameters();
				mfzch.game.logScores();
				mfzch.game.inProgress = true; // ***
				mfzch.saveData(mfzch.game, 'mfz.game');
				mfzch.saveData(mfzch.templateGame, 'mfz.templateGame', true);

				try {
					ga('send', 'event', 'Game', 'Action', 'Start', 0, false);
				} catch (err) {}
			}

			$('#undo').prop('disabled', true);
			$('#redo').prop('disabled', true);

			if (mfzch.undo.currentState) {
				$('#undo').prop('disabled', false);
			}

			if (mfzch.undo.currentState < mfzch.undo.validStates) {
				$('#redo').prop('disabled', false);
			}

			if (mfzch.game.doomsday < 1) {
				$('#end-round').hide();
			} else {
				$('#end-round').show();
			}

			if (mfzch.game.trackingLevel >= 30) {
				$('#frame-smash-status').show();
			} else {
				$('#frame-smash-status').hide();
			}
		}
	}
});

/* ---------------------- */
/* System simulator */

$(document).on('pagecreate', '#dice-roller', function(event){
	$(document).on('click', '#dice-roller .add-sys', function(){
		mfzch.frameSet[mfzch.frameNow].addSystem($(this).attr('data-sys-type'));
		mfzch.updateSystemDisplay(mfzch.frameSet[mfzch.frameNow]);
		mfzch.saveData(mfzch.frameSet, 'mfz.diceSim');
	});

	$(document).on('click', '#dice-roller .reset-sys', function(){
		mfzch.frameSet[mfzch.frameNow] = new frameModel();
		mfzch.frameSet[mfzch.frameNow].activeRange = $('#sys-range').val();
		mfzch.updateSystemDisplay(mfzch.frameSet[mfzch.frameNow]);
		mfzch.saveData(mfzch.frameSet, 'mfz.diceSim');
	});

	$(document).on('click', '#active-systems li', function(){
		mfzch.frameSet[mfzch.frameNow].removeSystem($(this).attr('data-sys'));
		mfzch.updateSystemDisplay(mfzch.frameSet[mfzch.frameNow]);
		mfzch.saveData(mfzch.frameSet, 'mfz.diceSim');
	});

	$(document).on('change', '#sys-range', function(){
		mfzch.frameSet[mfzch.frameNow].activeRange = $('#sys-range').val();
		mfzch.frameSet[mfzch.frameNow].rollResult = false;
		mfzch.updateSystemDisplay(mfzch.frameSet[mfzch.frameNow]);
		mfzch.saveData(mfzch.frameSet, 'mfz.diceSim');
	});

	$(document).on('click', '#dice-roller .roll-all', function(){
		mfzch.frameSet[mfzch.frameNow].rollAll();
		$('#active-dice').html(mfzch.frameSet[mfzch.frameNow].getRollDisplay());
		mfzch.saveData(mfzch.frameSet, 'mfz.diceSim');
		try {
			ga('send', 'event', 'Simulator', 'Action', 'Roll Frame', mfzch.frameNow, false);
		} catch (err) {}
	});

	$(document).on('change', '#die-frame', function(){
		if ($('#die-frame').val() == 'damage') {
			$( ":mobile-pagecontainer" ).pagecontainer( "change", "#damage-roller", { changeHash: false } );
		} else {
			var frame = parseInt($('#die-frame').val());
			mfzch.frameNow = frame;

			$('#sys-range').val(mfzch.frameSet[mfzch.frameNow].activeRange).selectmenu('refresh');
			mfzch.updateSystemDisplay(mfzch.frameSet[mfzch.frameNow]);
		}
	});
});

$(document).on("pagecontainerbeforeshow", function(event, ui){
	if (ui.toPage[0].id == 'dice-roller') {
		$('#die-frame').val(mfzch.frameNow).selectmenu('refresh');
		$('#sys-range').val(mfzch.frameSet[mfzch.frameNow].activeRange);
		$('#sys-range').selectmenu('refresh');

		mfzch.updateSystemDisplay(mfzch.frameSet[mfzch.frameNow]);
	}
});

$(document).on('pagecreate', '#damage-roller', function(event){
	$(document).on('change', '#die-frame2', function(){
		if ($('#die-frame2').val() != 'damage') {
			var frame = parseInt($('#die-frame2').val());

			mfzch.frameNow = frame;

			$( ":mobile-pagecontainer" ).pagecontainer( "change", "#dice-roller", { changeHash: false } );
		}
	});

	$(document).on('swiperight', '#damage-form', function(ev){
		ev.stopPropagation();
	});

	$(document).on('click', '#dmg-roll', function(){
		var attack = parseInt($('#dmg-attack').val());
		var spot = parseInt($('#dmg-spot').val());
		var defense = parseInt($('#dmg-defense').val());
		var totaldice = attack + spot - defense;

		$('#dmg-potential').html(totaldice);
		if (totaldice) {
			var dmgrolls = [0,0,0,0,0,0,0];
			for (var i = 0; i < totaldice; i++) {
				var dmg = rollDie(6);
				dmgrolls[dmg]++;
			}
			$('#dmg-4s').html(dmgrolls[4]);
			$('#dmg-5s').html(dmgrolls[5]);
			$('#dmg-6s').html(dmgrolls[6]);
		} else {
			$('#dmg-4s').html('-');
			$('#dmg-5s').html('-');
			$('#dmg-6s').html('-');
		}

		try {
			ga('send', 'event', 'Simulator', 'Action', 'Roll Damage', 0, false);
		} catch (err) {}

	});
});

$(document).on("pagecontainerbeforeshow", function(event, ui){
	if (ui.toPage[0].id == 'damage-roller') {
		$('#die-frame2').val("damage").selectmenu('refresh');
		mfzch.updateSystemDisplay(mfzch.frameSet[mfzch.frameNow]);
	}
});

/* ---------------------- */
/* Structured Units */

$(document).on('pagecreate', '#company-analysis', function(event){
	// add company
	$(document).on('click', '#company-add', function(){
		var company = new companyModel();

		var companyDesc = mfzch.generateDescriptor();

		company.name = companyDesc[0];
		company.color = companyDesc[1];

		mfzch.companies.push(company);
		mfzch.saveData(mfzch.companies, 'mfz.companies');

		mfzch.updateCompanyList();

		var companyid = mfzch.companies.length-1;
		var company = mfzch.companies[companyid];

		$('#company-index').val(companyid);
		$('#company-name').val(company.name);
		$('#company-color').val(company.color);

		$('#company-notice').hide();
		$('#company-track-assets').hide();
		$('#company-duplicate').hide();

		$('#company-adjust').popup('open');
		try {
			ga('send', 'event', 'Company', 'Action', 'Add Company', 0, false);
		} catch (err) {}

	});

	// manage company
	$(document).on('click', '#company-analysis .company-manage', function(){
		var companyid = $(this).parent().parent().parent().attr('data-companyid');
		var company = mfzch.companies[companyid];

		$('#company-index').val(companyid);
		$('#company-name').val(company.name);
		$('#company-color').val(company.color);

		$('#company-notice').hide();
		if (!company.frames.length) {
			$('#company-track-assets').hide();
		} else {
			$('#company-notice').empty();
			// move this section to company model, probably ***
			company.nonstandard = false;

			// frame number check
			if (company.frames.length > MAXBTFRAMES[2] || company.frames.length < MINSKFRAMES[5]) {
				$('#company-notice').append('<p>A standard game requires 3&#8211;8 frames.</p>');
				company.nonstandard = true;
				$('#company-notice').show();
			}
			// SSR check
			if (company.totalSSRs() != 3) {
				$('#company-notice').append('<p>A standard game requires 3 SSRs.</p>');
				company.nonstandard = true;
				$('#company-notice').show();
			}
			// frame naming check
			var namecheck = [];
			for (var i in company.frames) {
				namecheck.push(company.frames[i].name)
			}
			namecheck.sort();
			for (var i = 0; i < namecheck.length; i++) {
				if(namecheck[i+1] == namecheck[i]) {
					$('#company-notice').append('<p>This company has duplicate frame names, which may make system tracking difficult.</p>');
					$('#company-notice').show();
					break;
				}
			}
			$('#company-track-assets').show();
		}

		if (mfzch.companies.length < MAXCOMPANIES) {
			$('#company-duplicate').show();
		} else {
			$('#company-duplicate').hide();
		}

	});

	$(document).on('focus', '#company-name', function(){
		this.select();
	});

	$(document).on('change', '#company-name', function(){
		var companyid = $('#company-index').val();
		var company = mfzch.companies[companyid];

		company.name = $('#company-name').val();
		mfzch.saveData(mfzch.companies, 'mfz.companies');
		mfzch.updateCompanyList();
	});

	$(document).on('change', '#company-color', function(){
		var companyid = $('#company-index').val();
		var company = mfzch.companies[companyid];

		company.color = $('#company-color').val();
		mfzch.saveData(mfzch.companies, 'mfz.companies');
		mfzch.updateCompanyList();
	});

	// company regen name/color
	$(document).on('click', '#company-regen', function(){
		var companyid = $('#company-index').val();
		var company = mfzch.companies[companyid];

		var companyDesc = mfzch.generateDescriptor();
		company.name = companyDesc[0];
		company.color = companyDesc[1];

		$('#company-name').val(company.name);
		$('#company-color').val(company.color);
		mfzch.saveData(mfzch.companies, 'mfz.companies');
		mfzch.updateCompanyList();
	});

	// set company options
	$(document).on('click', '#company-submit', function(){
		$('#company-adjust').popup('close');
	});

	// delete company
	$(document).on('click', '.company-delete', function(){
		var companyid = $(this).parent().parent().parent().attr('data-companyid');
		mfzch.companies.splice(companyid, 1);
		mfzch.saveData(mfzch.companies, 'mfz.companies');
		$('#company-list [data-companyid=' + companyid + ']').fadeOut(function (){
			mfzch.updateCompanyList();
		});
	});

	// add frame
	$(document).on('click', '#company-analysis .frame-add', function(){
		var companyid = $(this).parent().parent().parent().attr('data-companyid');
		var frame = new frameModel();
		frame.name = uniqueName('Frame', buildNameArray(mfzch.companies[companyid].frames));

		mfzch.companies[companyid].frames.push(frame);
		mfzch.saveData(mfzch.companies, 'mfz.companies');

		mfzch.updateCompanyList();

		var frameid = mfzch.companies[companyid].frames.length-1;

		$('#company-index').val(companyid);
		$('#frame-index').val(frameid);
		$('#frame-name').val(mfzch.companies[companyid].frames[frameid].name);
		$('#frame-systems').html(mfzch.companies[companyid].frames[frameid].getSystemDisplay(false, true));
		$('#frame-graph').html(mfzch.companies[companyid].frames[frameid].createFrameGraph(false));

		$('#frame-adjust').popup('open');
		try {
			ga('send', 'event', 'Company', 'Action', 'Add Frame', 0, false);
		} catch (err) {}
	});

	// delete frame
	$(document).on('click', '#company-analysis .frame-del', function(){
		var companyid = $(this).parent().parent().parent().attr('data-companyid');
		var frameid = $(this).parent().attr('data-frameid');

		mfzch.companies[companyid].frames.splice(frameid, 1);
		mfzch.saveData(mfzch.companies, 'mfz.companies');

		$('#company-list [data-companyid=' + companyid + '] [data-frameid=' + frameid + ']').slideUp(function(){
			mfzch.updateCompanyList();
		});

	});

	// manage frame
	$(document).on('click', '.frame-manage', function(){
		var companyid = $(this).parent().parent().parent().attr('data-companyid');
		var frameid = $(this).parent().attr('data-frameid');

		var company = mfzch.companies[companyid];

		$('#company-index').val(companyid);
		$('#frame-index').val(frameid);
		$('#frame-name').val(mfzch.companies[companyid].frames[frameid].name);
		$('#frame-systems').html(mfzch.companies[companyid].frames[frameid].getSystemDisplay(false, true));
		$('#frame-graph').html(mfzch.companies[companyid].frames[frameid].createFrameGraph(false));
	});

	$(document).on('focus', '#frame-name', function(){
		this.select();
	});

	// add system
	$(document).on('click', '#company-analysis a.add-sys', function(){
		var companyid = $('#company-index').val();
		var frameid = $('#frame-index').val();

		mfzch.companies[companyid].frames[frameid].addSystem($(this).attr('data-sys-type'));
		$('#frame-systems').html(mfzch.companies[companyid].frames[frameid].getSystemDisplay(false, true));
		$('#frame-graph').html(mfzch.companies[companyid].frames[frameid].createFrameGraph(false));
		mfzch.updateCompanyList();
		mfzch.saveData(mfzch.companies, 'mfz.companies');
	});

	// reset systems
	$(document).on('click', '#company-analysis a.reset-sys', function(){
		var companyid = $('#company-index').val();
		var frameid = $('#frame-index').val();

		mfzch.companies[companyid].frames[frameid] = new frameModel();
		var bork = $('#frame-name').val();
		mfzch.companies[companyid].frames[frameid].name = $('<div/>').text(bork).html();
		$('#frame-systems').html(mfzch.companies[companyid].frames[frameid].getSystemDisplay(false, true));
		$('#frame-graph').html(mfzch.companies[companyid].frames[frameid].createFrameGraph(false));
		mfzch.updateCompanyList();
		mfzch.saveData(mfzch.companies, 'mfz.companies');
	});

	// remove system
	$(document).on('click', '#frame-systems li', function(){
		var companyid = $('#company-index').val();
		var frameid = $('#frame-index').val();

		mfzch.companies[companyid].frames[frameid].removeSystem($(this).attr('data-sys'));

		$('#frame-systems').html(mfzch.companies[companyid].frames[frameid].getSystemDisplay(false, true));
		$('#frame-graph').html(mfzch.companies[companyid].frames[frameid].createFrameGraph(false));
		mfzch.updateCompanyList();
		mfzch.saveData(mfzch.companies, 'mfz.companies');
	});

	$(document).on('change', '#frame-name', function(){
		var companyid = $('#company-index').val();
		var frameid = $('#frame-index').val();

		var bork = $('#frame-name').val();
		mfzch.companies[companyid].frames[frameid].name = $('<div/>').text(bork).html();

		mfzch.updateCompanyList();
		mfzch.saveData(mfzch.companies, 'mfz.companies');
	});

	$(document).on('click', '#frame-submit', function(){
		$('#frame-adjust').popup('close');
	});

	$(document).on('click', '#frame-graphtoggle', function(){
		$('#frame-graph').slideToggle();
	});

	$(document).on('click', '#frame-sim1', function(){
		var companyid = $('#company-index').val();
		var frameid = $('#frame-index').val();

		mfzch.frameNow = 1;
		jQuery.extend(mfzch.frameSet[1], mfzch.companies[companyid].frames[frameid]);

		try {
			ga('send', 'event', 'Company', 'Action', 'Send to Sim', 0, false);
		} catch (err) {}

		$( ":mobile-pagecontainer" ).pagecontainer( "change", "#dice-roller");

	});
	$(document).on('click', '#frame-sim2', function(){
		var companyid = $('#company-index').val();
		var frameid = $('#frame-index').val();

		mfzch.frameNow = 2;
		jQuery.extend(mfzch.frameSet[2], mfzch.companies[companyid].frames[frameid]);

		try {
			ga('send', 'event', 'Company', 'Action', 'Send to Sim', 0, false);
		} catch (err) {}

		$( ":mobile-pagecontainer" ).pagecontainer( "change", "#dice-roller");
	});

	$(document).on('click', '#company-track-assets', function(){
		$('#company-adjust').popup('option', 'afteropen', function(){
			$('#company-adjust').popup('option', 'afterclose', '');
		});
		$('#company-adjust').popup('option', 'afterclose', function(){
			if (mfzch.game.inProgress) {
				$('#company-track-gameinprogress').popup('open');
			} else if (mfzch.game.teams.length >= MAXTEAMS) {
				$('#company-full-add').hide();
				$('#company-full-list').html(mfzch.getTeamListForUnitStrucutre()).listview('refresh');
				$('#company-track-teamsfull').popup('open');
			} else {
				mfzch.addCompanyToAsset();
			}
		});
		$('#company-adjust').popup('close');
	});

	$(document).on('click', '#company-end-game', function(){
		mfzch.game.inProgress = false;
		mfzch.game.restoreFromTemplate();
		mfzch.saveData(mfzch.game, 'mfz.game');
		$('#company-track-gameinprogress').popup('option', 'afteropen', function(){
			$('#company-track-gameinprogress').popup('option', 'afterclose', '');
		});
		$('#company-track-gameinprogress').popup('option', 'afterclose', function(){
			if (mfzch.game.teams.length >= MAXTEAMS) {
				$('#company-full-add').hide();
				$('#company-full-list').html(mfzch.getTeamListForUnitStrucutre()).listview('refresh');
				$('#company-track-teamsfull').popup('open');
			} else {
				mfzch.addCompanyToAsset();
			}
		});

		$('#company-track-gameinprogress').popup('close');
	});

	$(document).on('click', '#company-full-list li', function(){
		var teamid = $(this).attr('data-id');
		mfzch.game.teams.splice(teamid, 1);
		mfzch.saveData(mfzch.game, 'mfz.game');

		$('#company-full-add').show();
		$('#company-full-list').html(mfzch.getTeamListForUnitStrucutre()).listview('refresh');
	});

	$(document).on('click', '#company-full-add', function(){
		$('#company-track-teamsfull').popup('option', 'afteropen', function(){
			$('#company-track-teamsfull').popup('option', 'afterclose', '');
		});
		$('#company-track-teamsfull').popup('option', 'afterclose', function(){
			var companyid = $('#companyinfo-name').attr('data-company-id');

			mfzch.addCompanyToAsset();
		});
		$('#company-track-teamsfull').popup('close');
	});

	$(document).on('click', '#company-duplicate', function(){
		var srcCompanyIndex = $('#company-index').val();

		var destCompany = new companyModel();

		$.extend(true, destCompany, mfzch.companies[srcCompanyIndex]);

		destCompany.name = uniqueName(destCompany.name, buildNameArray(mfzch.companies));
		mfzch.companies.push(destCompany);
		mfzch.saveData(mfzch.companies, 'mfz.companies');

		mfzch.updateCompanyList();

		$('#company-adjust').popup('close');
		try {
			ga('send', 'event', 'Company', 'Action', 'Duplicate Company', 0, false);
		} catch (err) {}
	});

	$(document).on('change', '#settings-showunitgraphs', function(){
		if ($(this).val() == 'on') {
			mfzch.settings.showUnitGraphs = true;
			$('.company-graph-in-list').stop().slideDown();
		} else {
			mfzch.settings.showUnitGraphs = false;
			$('.company-graph-in-list').stop().slideUp();
		}
		mfzch.saveData(mfzch.settings, 'mfz.settings');
	});

});

$(document).on("pagecontainerbeforeshow", function(event, ui){
	if (ui.toPage[0].id == 'company-analysis') {
		mfzch.updateCompanyList();

		if (mfzch.settings.showUnitGraphs) {
			$('#settings-showunitgraphs').val('on');
			$('.company-graph-in-list').show();
		} else {
			$('#settings-showunitgraphs').val('off');
			$('.company-graph-in-list').hide();
		}
		$('#settings-showunitgraphs').slider('refresh');

	}
});

/* ---------------------- */
/* loadouts */

$(document).on('pagecreate', '#loadouts', function(event){
	$(document).on('click', '#loadouts .loadout-graph', function(){
		mfzch.extractLoadoutFromTitle(this, '#lo-data');
		var load = mfzch.convertHtmlToLoadout('#lo-data');
		$('#loadout-frameinfo-name').html(load.name);
		$('#loadout-frameinfo-graph').html(load.createFrameGraph(false));

		$('#loadout-framegraph').popup('open');
	});


	$(document).on('click', '#loadouts .add-to-company', function(){
		$('#lo-company-list').html(mfzch.getCompanyListForLoadouts());

		if(mfzch.companies.length < MAXCOMPANIES) {
			$('#lo-company-list').append('<li data-icon="plus"><a href="#">Add New</a></li>')
		}
		$('#lo-company-list').listview('refresh');

		mfzch.extractLoadoutFromTitle(this, '#lo-data');

		$('#loadout-add-to-company').popup('open');
	});

	$(document).on('click', '#lo-company-list li', function(){
		var load = mfzch.convertHtmlToLoadout('#lo-data');

		var companyid = $(this).attr('data-id');
		if (typeof(companyid) !== 'undefined' && companyid !== false) {
			if (mfzch.companies[companyid].frames.length < MAXFRAMES) {
				load.name = uniqueName(load.name, buildNameArray(mfzch.companies[companyid].frames))
				mfzch.companies[companyid].frames.push(load);
				mfzch.saveData(mfzch.companies, 'mfz.companies');

				try {
					ga('send', 'event', 'Loadouts', 'Action', 'Add Frame', 0, false);
				} catch (err) {}

				$('#loadout-add-to-company').popup('close');
			}
		} else {
			var company = new companyModel;
			var companyDesc = mfzch.generateDescriptor();
			company.name = companyDesc[0];
			company.color = companyDesc[1];

			company.frames.push(load);
			mfzch.companies.push(company);
			mfzch.saveData(mfzch.companies, 'mfz.companies');

			try {
				ga('send', 'event', 'Loadouts', 'Action', 'Add Company', 0, false);
			} catch (err) {}

			$('#loadout-add-to-company').popup('close');
		}
	});

	// add loadout
	$(document).on('click', '#loadouts #loadout-add', function(){
		var load = new frameModel();

		var nameArray = [];
		for (var i in mfzch.loadouts) {
			nameArray.push(mfzch.loadouts[i].name);
		}

		load.name = uniqueName('Custom Loadout', nameArray);

		mfzch.loadouts.push(load);
		mfzch.saveData(mfzch.loadouts, 'mfz.loadouts');

		mfzch.updateLoadoutList();

		var loadid = mfzch.loadouts.length-1;

		$('#loadout-index').val(loadid);
		$('#loadout-name').val(mfzch.loadouts[loadid].name);
		$('#loadout-systems').html(mfzch.loadouts[loadid].getSystemDisplay(false, false));
		$('#loadout-graph').html(mfzch.loadouts[loadid].createFrameGraph(false));

		$('#loadout-adjust').popup('open');
		try {
			ga('send', 'event', 'Loadouts', 'Action', 'Add Loadout', 0, false);
		} catch (err) {}
	});

	// delete loadout
	$(document).on('click', '#loadouts .load-del', function(){
		var loadid = $(this).parent().attr('data-load-id');

		mfzch.loadouts.splice(loadid, 1);
		mfzch.saveData(mfzch.loadouts, 'mfz.loadouts');

		$('#loadouts-custom [data-load-id=' + loadid + ']').slideUp(function(){
			mfzch.updateLoadoutList();
		});
	});

	// manage loadout
	$(document).on('click', '#loadouts .load-manage', function(){
		var loadid = $(this).parent().attr('data-load-id');

		$('#loadout-index').val(loadid);
		$('#loadout-name').val(mfzch.loadouts[loadid].name);
		$('#loadout-systems').html(mfzch.loadouts[loadid].getSystemDisplay(false, false));
		$('#loadout-graph').html(mfzch.loadouts[loadid].createFrameGraph(false));
	});

	$(document).on('focus', '#loadout-name', function(){
		this.select();
	});

	// loadout add system
	$(document).on('click', '#loadouts a.add-sys', function(){
		var loadid = $('#loadout-index').val();

		mfzch.loadouts[loadid].addSystem($(this).attr('data-sys-type'));
		$('#loadout-systems').html(mfzch.loadouts[loadid].getSystemDisplay(false, false));
		$('#loadout-graph').html(mfzch.loadouts[loadid].createFrameGraph(false));
		mfzch.updateLoadoutList();
		mfzch.saveData(mfzch.loadouts, 'mfz.loadouts');
	});

	// loadout reset systems
	$(document).on('click', '#loadouts a.reset-sys', function(){
		var loadid = $('#loadout-index').val();

		mfzch.loadouts[loadid] = new frameModel();
		var bork = $('#loadout-name').val();  // preserve name
		mfzch.loadouts[loadid].name = $('<div/>').text(bork).html();

		$('#loadout-systems').html(mfzch.loadouts[loadid].getSystemDisplay(false, false));
		$('#loadout-graph').html(mfzch.loadouts[loadid].createFrameGraph(false));
		mfzch.updateLoadoutList();
		mfzch.saveData(mfzch.loadouts, 'mfz.loadouts');
	});

	// loadout remove system
	$(document).on('click', '#loadout-systems li', function(){
		var loadid = $('#loadout-index').val();

		mfzch.loadouts[loadid].removeSystem($(this).attr('data-sys'));

		$('#loadout-systems').html(mfzch.loadouts[loadid].getSystemDisplay(false, false));
		$('#loadout-graph').html(mfzch.loadouts[loadid].createFrameGraph(false));
		mfzch.updateLoadoutList();
		mfzch.saveData(mfzch.loadouts, 'mfz.loadouts');
	});

	// loadout update name
	$(document).on('change', '#loadout-name', function(){
		var loadid = $('#loadout-index').val();

		var bork = $('#loadout-name').val(); // sanitize
		mfzch.loadouts[loadid].name = $('<div/>').text(bork).html();

		mfzch.updateLoadoutList();
		mfzch.saveData(mfzch.loadouts, 'mfz.loadouts');
	});

	$(document).on('click', '#loadout-submit', function(){
		$('#loadout-adjust').popup('close');
	});

	$(document).on('click', '#loadout-graphtoggle', function(){
		$('#loadout-graph').slideToggle(function(){
			if ($('#loadout-graph:visible').length) {
				mfzch.settings.showLoadoutGraph = true;
			} else {
				mfzch.settings.showLoadoutGraph = false;
			}
			mfzch.saveData(mfzch.settings, 'mfz.settings');
		});
	});

	$(document).on('click', '#loadout-add-to-company-btn', function(){
		var loadid = $('#loadout-index').val();

		$('#lo-company-list').html(mfzch.getCompanyListForLoadouts());

		if(mfzch.companies.length < MAXCOMPANIES) {
			$('#lo-company-list').append('<li data-icon="plus"><a href="#">Add New</a></li>')
		}
		$('#lo-company-list').listview('refresh');

		$('#lo-data').attr('data-name', mfzch.loadouts[loadid].name);
		$('#lo-data').html(mfzch.loadouts[loadid].getSystemDisplay(false, false));

		$('#loadout-adjust').popup('option', 'afterclose', function(){
			$('#loadout-add-to-company').popup('open');
		});
		$('#loadout-adjust').popup('option', 'afteropen', function(){
			$('#loadout-adjust').popup('option', 'afterclose', '');
		});
		$('#loadout-adjust').popup('close');
	});
});

$(document).on("pagecontainerbeforeshow", function(event, ui){
	if (ui.toPage[0].id == 'loadouts') {
		mfzch.updateLoadoutList();

		if (mfzch.settings.showLoadoutGraph) {
			$('#loadout-graph').show();
		} else {
			$('#loadout-graph').hide();
		}
	}
});

/* ---------------------- */
/* settings */

$(document).on('pagecreate', '#settings', function(event){
	$(document).on('change', '#settings-enablesplits', function(){
		if ($(this).val() == 'on') {
			mfzch.settings.enableSplitSystems = true;
		} else {
			mfzch.settings.enableSplitSystems = false;
		}
		mfzch.saveData(mfzch.settings, 'mfz.settings');
	});

	/* *** */
	$(document).on('change', '#settings-enableenvironmental', function(){
		if ($(this).val() == 'on') {
			mfzch.settings.enableEnvironmental = true;
		} else {
			mfzch.settings.enableEnvironmental = false;
		}
		mfzch.saveData(mfzch.settings, 'mfz.settings');
	});

	$(document).on('change', '#settings-nonthematic', function(){
		if ($(this).val() == 'on') {
			mfzch.settings.nonThematicNav = true;
			$('.nav-listview').replaceWith(mfzch.buildNav())
			$('.nav-listview').listview();
		} else {
			mfzch.settings.nonThematicNav = false;
			$('.nav-listview').replaceWith(mfzch.buildNav())
			$('.nav-listview').listview();
		}
		mfzch.saveData(mfzch.settings, 'mfz.settings');
	});

	$(document).on('change', '#settings-compactui', function(){
		if ($(this).val() == 'on') {
			mfzch.settings.compactUI = true;
			$('body').addClass('compact-ui');
		} else {
			mfzch.settings.compactUI = false;
			$('body').removeClass('compact-ui');
		}
		mfzch.saveData(mfzch.settings, 'mfz.settings');
	});

	$(document).on('change', 'input[name=settings-attackgraph]', function(){
		if ($(this).val() == 'on') {
			mfzch.settings.altAttackGraphType = true;
		} else {
			mfzch.settings.altAttackGraphType = false;
		}
		mfzch.saveData(mfzch.settings, 'mfz.settings');
	});
});

$(document).on("pagecontainerbeforeshow", function(event, ui){
	if (ui.toPage[0].id == 'settings') {
		if (mfzch.settings.enableSplitSystems) {
			$('#settings-enablesplits').val('on');
		} else {
			$('#settings-enablesplits').val('off');
		}
		$('#settings-enablesplits').slider('refresh');

		/* *** */
		if (mfzch.settings.enableEnvironmental) {
			$('#settings-enableenvironmental').val('on');
		} else {
			$('#settings-enableenvironmental').val('off');
		}
		$('#settings-enableenvironmental').slider('refresh');

		if (mfzch.settings.nonThematicNav) {
			$('#settings-nonthematic').val('on');
		} else {
			$('#settings-nonthematic').val('off');
		}
		$('#settings-nonthematic').slider('refresh');

		if (mfzch.settings.compactUI) {
			$('#settings-compactui').val('on');
		} else {
			$('#settings-compactui').val('off');
		}
		$('#settings-compactui').slider('refresh');

		if (mfzch.settings.altAttackGraphType) {
			$('#settings-attackgraph-2').prop('checked', true);
		} else {
			$('#settings-attackgraph-1').prop('checked', true);
		}
		$('input[name=settings-attackgraph]').checkboxradio('refresh');

		$('#settings-usage').empty();

		$('#settings-usage').append('<li>Games Played: '+ mfzch.settings.gamesPlayed + '</li>');
		$('#settings-usage').append('<li>Frames Destroyed: '+ mfzch.settings.framesDestroyed + '</li>');
		$('#settings-usage').append('<li>Systems Destroyed: '+ mfzch.settings.systemsDestroyed + '</li>');
	}
});

/* ---------------------- */

// External/download link tracking
jQuery(document).ready(function($) {
	var filetypes = /\.(zip|exe|dmg|pdf|doc.*|xls.*|ppt.*|mp3|txt|rar|wma|mov|avi|wmv|flv|wav)$/i;
	var baseHref = '';
	if (jQuery('base').attr('href') != undefined) baseHref = jQuery('base').attr('href');

	jQuery('a').on('click', function(event) {
		var el = jQuery(this);
		var track = true;
		var href = (typeof(el.attr('href')) != 'undefined' ) ? el.attr('href') :"";
		var isThisDomain = href.match(document.domain.split('.').reverse()[1] + '.' + document.domain.split('.').reverse()[0]);
		if (!href.match(/^javascript:/i)) {
			var elEv = []; elEv.value=0, elEv.non_i=false;
			if (href.match(/^mailto\:/i)) {
				elEv.category = "email";
				elEv.action = "click";
				elEv.label = href.replace(/^mailto\:/i, '');
				elEv.loc = href;
			}
			else if (href.match(filetypes)) {
				var extension = (/[.]/.exec(href)) ? /[^.]+$/.exec(href) : undefined;
				elEv.category = "download";
				elEv.action = "click-" + extension[0];
				elEv.label = href.replace(/ /g,"-");
				elEv.loc = baseHref + href;
			}
			else if (href.match(/^https?\:/i) && !isThisDomain) {
				elEv.category = "external";
				elEv.action = "click";
				elEv.label = href.replace(/^https?\:\/\//i, '');
				elEv.non_i = true;
				elEv.loc = href;
			}
			else if (href.match(/^tel\:/i)) {
				elEv.category = "telephone";
				elEv.action = "click";
				elEv.label = href.replace(/^tel\:/i, '');
				elEv.loc = href;
			}
			else track = false;

			if (track) {
				try {
					ga('send', 'event', elEv.category.toLowerCase(), elEv.action.toLowerCase(), elEv.label.toLowerCase(), elEv.value, elEv.non_i);
					//		  _gaq.push(['_trackEvent', elEv.category.toLowerCase(), elEv.action.toLowerCase(), elEv.label.toLowerCase(), elEv.value, elEv.non_i]);
				} catch (err) {}
				if ( el.attr('target') == undefined || el.attr('target').toLowerCase() != '_blank') {
					setTimeout(function() { location.href = elEv.loc; }, 400);
					return false;
				}
			}
		}
	});
});

} // close jQuery check