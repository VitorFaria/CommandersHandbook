function settingsModel() {
	// settable preferences
	this.enableSplitSystems = false;
	this.enableEnvironmental = false; // ***
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
};