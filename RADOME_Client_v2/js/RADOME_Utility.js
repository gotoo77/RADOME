function f_Update_GUISelect(frame){
	// Update GUI elements concerned 
	//get a reference to the select element
	$select = $('#SelectRADOMECmds');
	$selectNEW = $('#SelectRADOMECmds_NEW');
		//clear the current content of the select
		$select.html('');
		$selectNEW.html('');
		//iterate over the data and append a select option
		$.each(frame.RADOME_Cmds, function(key, val){
		  $select.append('<option id="' + val.id + '">' + val.name + '</option>');
		   $selectNEW.append('<option value="' + val.id + '">' + val.name + '</option>');
		})	
		
    $selectNEW.selectpicker('refresh');
}

/****************************************************************************************************
f_FillSelectFromJSON
****************************************************************************************************/
function f_FillSelectFromJSON() {
	//get a reference to the select element
	$select = $('#SelectRADOMECmds');
	$selectNEW = $('#SelectRADOMECmds_NEW');
	
	//request the JSON data and parse into the select element (ajax jQuery)
	$.ajax({
	  url: 'RADOME_Cmds.json',
	  dataType:'JSON',
	  success:function(data, txt){
		console.log('f_FillSelectFromJSON text:' + txt );
		//clear the current content of the select
		$select.html(''); $selectNEW.html('');
		//iterate over the data and append a select option
		$.each(data.RADOME_Cmds, function(key, val){
		  $select.append('<option id="' + val.id + '">' + val.name + '</option>');
		  $selectNEW.append('<option value="' + val.id + '">' + val.name + '</option>');
		})
		 $selectNEW.selectpicker('refresh');
	  },
	  error:function(err){
	  	console.log('f_FillSelectFromJSON text:' + err.statusText +' status:'+ err.status );
		//if there is an error append a 'none available' option		 
		$select.html('<option id="-1">no command found</option>');
		//$selectNEW.html('<option title="no command found"</option>');
	  }
	   
	});
	/*
	$http.get('RADOME_Cmds.json')
		.success(function(data, status) {
				//clear the current content of the select
				$select.html(''); $selectNEW.html('');
				//iterate over the data and append a select option
				$.each(data.RADOME_Cmds, function(key, val){
				  $select.append('<option id="' + val.id + '">' + val.name + '</option>');
				   $selectNEW.append('<option id="' + val.id + '">' + val.name + '</option>');
				})
				//$scope.RADOME_Cmds = data;
				console.log('f_FillSelectFromJSON success :' + status);
        }).
		error(function(data, status) {
		  // log error
		  console.log('f_FillSelectFromJSON error :' + status);
		});*/
		
}

/****************************************************************************************************
getComboA
****************************************************************************************************/
function getComboA(sel) {
	var myvalue = sel.value;  
	var elem = document.getElementById("text_to_send");
	elem.value = myvalue;
	//Force to simulate a click on a specific HTML element (using jQuery)
	$("#button_send").click();
}

/****************************************************************************************************
getComboB
****************************************************************************************************/
function getComboB(sel) {
	var myvalue = sel[sel.selectedIndex].text;  
	var elem = document.getElementById("text_to_send");
	elem.value = myvalue;
	//Force to simulate a click on a specific HTML element (using jQuery)
	$("#button_send").click();
}

/****************************************************************************************************
display_from_JSON() 
****************************************************************************************************/
function display_from_JSON() {
	// get html element concerned
	$conf_to_display = $('#conf_to_display');
	//var elem = document.getElementById("conf_to_display");
	//clear the current content of the select
	$conf_to_display.html('');
		
	jsonStr = JSON.stringify(flowplayer_conf),  // THE OBJECT STRINGIFIED
	regeStr = '', // A EMPTY STRING TO EVENTUALLY HOLD THE FORMATTED STRINGIFIED OBJECT
	f = {
		brace: 0
	}; // AN OBJECT FOR TRACKING INCREMENTS/DECREMENTS,
	   // IN PARTICULAR CURLY BRACES (OTHER PROPERTIES COULD BE ADDED)

	regeStr = jsonStr.replace(/({|}[,]*|[^{}:]+:[^{}:,]*[,{]*)/g, function (m, p1) {
	var rtnFn = function() {
			return '<div style="text-indent: ' + (f['brace'] * 20) + 'px;">' + p1 + '</div>';
		},
		rtnStr = 0;
		if (p1.lastIndexOf('{') === (p1.length - 1)) {
			rtnStr = rtnFn();
			f['brace'] += 1;
		} else if (p1.indexOf('}') === 0) {
			 f['brace'] -= 1;
			rtnStr = rtnFn();
		} else {
			rtnStr = rtnFn();
		}
		return rtnStr;
	});

	$conf_to_display.append(regeStr);
	//elem.innerHTML += regeStr; // appends the result to the body of the HTML document	
}