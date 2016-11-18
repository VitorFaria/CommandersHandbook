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