/***********************************************
filename : RADOME_GUI_elements.js 

this file contains the javascript code relative
to the client-sided GUI elements used to show 
data streams sent from RADOME server 
***********************************************/

/****************************************************************************************************
GUI element 'Speed Gauge' configuration
****************************************************************************************************/

var gauge = new Gauge({
		renderTo    : 'gauge',
		width       : document.body.offsetWidth,
		height      : document.body.offsetHeight,
		glow        : true,
		units       : 'Km/h',
		title       : 'Vitesse',
		minValue    : 0,
		maxValue    : 220,
		majorTicks  : ['0','20','40','60','80','100','120','140','160','180','200','220'],
		minorTicks  : 2,
		strokeTicks : false,
		highlights  : [
			{ from : 0,   to : 50, color : 'rgba(0,   255, 0, .15)' },
			{ from : 50, to : 100, color : 'rgba(255, 255, 0, .15)' },
			{ from : 100, to : 150, color : 'rgba(255, 30,  0, .25)' },
			{ from : 150, to : 200, color : 'rgba(255, 0,  225, .25)' },
			{ from : 200, to : 220, color : 'rgba(0, 0,  255, .25)' }
		],
		colors      : {
			plate      : '#222',
			majorTicks : '#f5f5f5',
			minorTicks : '#ddd',
			title      : '#fff',
			units      : '#ccc',
			numbers    : '#eee',
			needle     : { start : 'rgba(240, 128, 128, 1)', end : 'rgba(255, 160, 122, .9)' }
		}
	});

	gauge.draw();
/*
window.onresize= function() {
	gauge1.updateConfig({
		width  : document.cont_gauge.offsetWidth,
		height : document.cont_gauge.offsetHeight
	});
};*/


/****************************************************************************************************
GUI element 'Chart Graph' configuration
****************************************************************************************************/
//window.onload = function () {
function f_JSONDraw_Graph_CAN (temperature_can_value){
	//initial value of dataPoints 
	var dps = [
	{label: "Cuve 1", y: temperature_can_value[0]},
	{label: "Cuve 2", y: temperature_can_value[1]},
	{label: "Cuve 3", y: temperature_can_value[2]},
	{label: "Cuve 4", y: temperature_can_value[3]},
	{label: "Cuve 5", y: temperature_can_value[4]},
	{label: "Cuve 6", y: temperature_can_value[4]}
	];	

	var chart = new CanvasJS.Chart("chartContainer_1",{			
		title: {
			text: "Temperatures ( differentes sondes moteur) "		
		},
		axisY: {				
			suffix: " degres"
		},		
		legend :{
			verticalAlign: 'bottom',
			horizontalAlign: "center"
		},
		data: [
		{
			type: "column",	
			bevelEnabled: true,				
			indexLabel: "{y} C",
			dataPoints: dps					
		}
		]
	});

	var updateInterval = 300;	

	var updateChart = function () {

		for (var i = 0; i < dps.length; i++) {
			
			// generating random variation deltaY
			//var deltaY = Math.round(6 + Math.random() *(-12));
			var deltaY = 0;			
			var yVal = deltaY + dps[i].y > 0 ? dps[i].y + deltaY : 0;
			var boilerColor;


			// color of dataPoint dependent upon y value. 

			boilerColor =
			yVal > 200 ? "red":
			yVal >= 170 ? "orange":
			yVal < 170 ? "green":							
			null;

			// updating the dataPoint
			dps[i] = {label: "Sonde"+(i+1) , y: yVal, color: boilerColor};

		};
		chart.render();
	};
	updateChart();		

	// update chart after specified interval 
	setInterval(function(){updateChart()}, updateInterval);
}

