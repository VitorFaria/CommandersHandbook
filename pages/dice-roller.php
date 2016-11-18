<div data-role="page" id="dice-roller">
	<div data-role="header" data-position="fixed" data-tap-toggle="false">
		<h1>System Simulation</h1>
		<a href="#nav-panel" class="ui-btn-left ui-btn ui-corner-all ui-btn-icon-notext ui-icon-bars">Navigation</a>
	</div>

	<div role="main" class="ui-content">
		<div class="typebox">
			<form>
				<label for="die-frame" class="hide-if-compact-ui">Simulate</label>
				<select name="die-frame" id="die-frame">
					<option value="1">Frame 1</option>
					<option value="2">Frame 2</option>
					<option value="damage">Damage</option>
				</select>
			</form>
		</div>
		<div class="rangebox">
			<label for="sys-range" class="hide-if-compact-ui">Active Range</label>
			<select id="sys-range">
				<option value="h">Hand-to-hand</option>
				<option selected value="d">Direct-fire</option>
				<option value="a">Artillery</option>
			</select>
		</div>
		<div class="addbox">
			<p class="hide-if-compact-ui"> Add Systems </p>
			<p class="shrink-if-compact-ui"><a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="w">W</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="rh">Rh</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="rd">Rd</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="ra">Ra</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="b">B</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="y">Y</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="g">G</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="ssr">SSR</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="rhd" data-sys-split="true">Rh/d</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="rha" data-sys-split="true">Rh/a</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="rda" data-sys-split="true">Rd/a</a>
				<a href="#" class="add-sys ui-btn ui-btn-inline ui-corner-all" data-sys-type="e" data-sys-env="true">E</a>
				<a href="#" class="reset-sys ui-btn ui-btn-b ui-btn-inline ui-corner-all">Reset</a></p>
		</div>

		<div class="sysbox">
			<p class="hide-if-compact-ui">Current Systems <small>(tap to remove)</small></p>
			<div id="active-systems"></div>
		</div>

		<div class="resultbox">
			<p class="hide-if-compact-ui">Dice you roll</p>
			<div id="active-dice"></div>
			<a href="#" class="roll-all ui-btn ui-btn-b ui-icon-action ui-btn-icon-left ui-corner-all">Run Simulation</a>
		</div>

		<div class="framespec"></div>
	</div>
</div>