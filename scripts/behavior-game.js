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