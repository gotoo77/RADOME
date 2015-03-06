/***********************************************
filename : RADOME_Main.js 

this file contains the JavaScript code relative
to the Main functionalities used in this
client-sided RADOME interface 
***********************************************/

// Global variables for RADOME client interface

// Class 'RADOME_Conf' used for settings parameters
function RADOME_Conf(	DebugMode, ConsoleLog, AddLog_Create, AddLog_OnOpen
						,AddLog_OnError, AddLog_OnMessage, AddLog_OnClose
						,AddLog_Exception, AddLog_Warning, AddLog_Send )
 {
 	var  
		publics = this,
		privates = {};
		
	/*** Méthodes publiques. ***/
	//getter & setter pour la variable "DebugMode"
	publics.getDebugMode = function () {
		// Cette méthode est attachée à publics, elle est donc accessible de l'extérieur.
		return privates.DebugMode; 
		// "privates.DebugMode" est accessible car une méthode fait partie du contexte d'exécution de son constructeur.
	}
	publics.setDebugMode = function (value) {
		privates.DebugMode = value;
	}
	//getter & setter pour la variable "ConsoleLog"
	publics.getConsoleLog = function () {
		return privates.ConsoleLog; 
	}
	publics.setConsoleLog = function (value) {
		privates.ConsoleLog = value;
	}	
	//getter & setter pour la variable "AddLog_Create"
	publics.getAddLog_Create = function () {
		return privates.AddLog_Create; 
	}
	publics.setAddLog_Create = function (value) {
		privates.AddLog_Create = value;
	}	
		//getter & setter pour la variable "AddLog_OnOpen"
	publics.getAddLog_OnOpen = function () {
		return privates.AddLog_OnOpen; 
	}
	publics.setAddLog_OnOpen = function (value) {
		privates.AddLog_OnOpen = value;
	}	
		//getter & setter pour la variable "AddLog_OnError"
	publics.getAddLog_OnError = function () {
		return privates.AddLog_OnError; 
	}
	publics.setAddLog_OnError = function (value) {
		privates.AddLog_OnError = value;
	}	
		//getter & setter pour la variable "AddLog_OnMessage"
	publics.getAddLog_OnMessage = function () {
		return privates.AddLog_OnMessage; 
	}
	publics.setAddLog_OnMessage = function (value) {
		privates.AddLog_OnMessage = value;
	}	
		//getter & setter pour la variable "AddLog_OnClose"
	publics.getAddLog_OnClose = function () {
		return privates.AddLog_OnClose; 
	}
	publics.setAddLog_OnClose = function (value) {
		privates.AddLog_OnClose = value;
	}	
		//getter & setter pour la variable "AddLog_Warning"
	publics.getAddLog_Warning = function () {
		return privates.AddLog_Warning; 
	}
	publics.setAddLog_Warning = function (value) {
		privates.AddLog_Warning = value;
	}	
		//getter & setter pour la variable "AddLog_Exception"
	publics.getAddLog_Exception = function () {
		return privates.AddLog_Exception; 
	}
	publics.setAddLog_Exception = function (value) {
		privates.AddLog_Exception = value;
	}	
		//getter & setter pour la variable "AddLog_Send"
	publics.getAddLog_Send = function () {
		return privates.AddLog_Send; 
	}
	publics.setAddLog_Send = function (value) {
		privates.AddLog_Send = value;
	}		
	
	//return default config
		publics.getDefaultConf = function () {
		var array = new Array();
		//array.push("DebugMode");
		array.push("ConsoleLog");
		array.push("AddLog_Create");
		array.push("AddLog_OnOpen");
		array.push("AddLog_OnError");
		array.push("AddLog_OnMessage");
		array.push("AddLog_OnClose");
		array.push("AddLog_Exception");
		array.push("AddLog_Warning");
		array.push("AddLog_Send");
		return array;
	}
	
	//return Full config
	publics.getCompleteConf = function () {
		var array = new Array();
		if (privates.DebugMode)
			array.push("DebugMode");
		if (privates.ConsoleLog)
		array.push("ConsoleLog");
		if (privates.AddLog_Create)
		array.push("AddLog_Create");
		if (privates.AddLog_OnOpen)
		array.push("AddLog_OnOpen");
		if (privates.AddLog_OnError)
		array.push("AddLog_OnError");
		if (privates.AddLog_OnMessage)
		array.push("AddLog_OnMessage");
		if (privates.AddLog_OnClose)
		array.push("AddLog_OnClose");
		if (privates.AddLog_Exception)
		array.push("AddLog_Exception");
		if (privates.AddLog_Warning)
		array.push("AddLog_Warning");
		if (privates.AddLog_Send)
		array.push("AddLog_Send");
		return array;
	}
	
	// Constructeur - on utilise les setters associes si les valeurs sont renseignés
	if (DebugMode != 'undefined') {
		publics.setDebugMode(DebugMode);
	}
	if (ConsoleLog!= 'undefined') {
		publics.setConsoleLog(ConsoleLog);
	}	
	if (AddLog_Create!= 'undefined') {
		publics.setAddLog_Create(AddLog_Create);
	}
	if (AddLog_OnOpen!= 'undefined') {
		publics.setAddLog_OnOpen(AddLog_OnOpen);
	}		
	if (AddLog_OnError!= 'undefined') {
		publics.setAddLog_OnError(AddLog_OnError);
	}
	if (AddLog_OnMessage!= 'undefined') {
		publics.setAddLog_OnMessage(AddLog_OnMessage);
	}		
	if (AddLog_OnClose!= 'undefined') {
		publics.setAddLog_OnClose(AddLog_OnClose);
	}
	if (AddLog_Exception!= 'undefined') {
		publics.setAddLog_Exception(AddLog_Exception);
	}		
	if (AddLog_Warning!= 'undefined') {
		publics.setAddLog_Warning(AddLog_Warning);
	}
	if (AddLog_Send!= 'undefined') {
		publics.setAddLog_Send(AddLog_Send);
	}

}

// global variable for scope operations used in angular
var gScope; 
// create and set the Configuration object for client RADOME
var go_RADOME_Conf = new RADOME_Conf(false,true,true,true,true,true,true,true,true,true);
/*
Object.defineProperties(go_RADOME_Conf, {
    "_debugMode": { get: function () { return this.DebugMode; } },
    "set_debugMode": { set: function (x) { this.DebugMode = x ; } }
});
go_RADOME_Conf.set_debugMode = true // Utilise le setter e
console.log(go_RADOME_Conf._debugMode) // Utilise le getter
*/
f_RADOME_log(go_RADOME_Conf);

//var gRADOMEAudioPath="C:/EPR_Logiciels/RADOME/Client/media/audio/";
	
// variables for Websockets
var bWsState_Can1 = false;
var bWsState_Can2 = false;
var bWsState_Can3 = false;
var bWsState_Can4 = false;
var bWsState_Can5 = false;
var bWsState_VIDEO = false;
var bWsState_AUDIO = false;
var bWsState_NAV = false;
var bMenuButtonCar = false;
var bMenuButtonVideo = false;
var bMenuButtonAudio = false;
var bMenuButtonNav = false;

// Websocket(s) object(s) settings

//var websocketurl = 'ws://127.0.0.1:9000';
var cProtocols = new Object(); 
cProtocols.RADOME = 'RADOME';
cProtocols.dumb = 'dumb-increment-protocol';
cProtocols.http = 'http-only';

var ip_adress = "127.0.0.1";
//var ip_adress = "matis-port-1133";
//var ip_adress = "localhost";
//var ip_adress = "192.168.100.157";

var gRADOME_Conf = 
{
	Websocket:	{  	MAIN: {name:"MAIN", webSocketProtocol:cProtocols.RADOME,  webSocketUrl:"ws://"+ip_adress+":9000" }, 
					CAN1: {name:"CAN1", webSocketProtocol:cProtocols.RADOME,  webSocketUrl:"ws://"+ip_adress+":9001" },
					CAN2: {name:"CAN2", webSocketProtocol:cProtocols.RADOME,  webSocketUrl:"ws://"+ip_adress+":9002" },
					CAN3: {name:"CAN3", webSocketProtocol:cProtocols.RADOME,  webSocketUrl:"ws://"+ip_adress+":9003" }, 
					CAN4: {name:"CAN4", webSocketProtocol:cProtocols.RADOME,  webSocketUrl:"ws://"+ip_adress+":9004" },
					CAN5: {name:"CAN5", webSocketProtocol:cProtocols.RADOME,  webSocketUrl:"ws://"+ip_adress+":9005" },
					VIDEO: {name:"VIDEO", webSocketProtocol:cProtocols.RADOME,  webSocketUrl:"ws://"+ip_adress+":9006" },
					AUDIO: {name:"AUDIO", webSocketProtocol:cProtocols.RADOME,  webSocketUrl:"ws://"+ip_adress+":9007" },
					NAV: {name:"NAV", webSocketProtocol:cProtocols.RADOME,  	webSocketUrl:"ws://"+ip_adress+":9008" }
				}, 
	iNbMP3FilesFound: 0,
	AudioList : new Array(),
	AudioTitle : new Array(),
	AudioPath : new Array(),
	AudioDescription : new Array()	,
	GUI_BarGraph : new Array
 };

//Enum from RADOME server (see "..\RADOME_WebSocket\RADOME_export.h") for defined values
var APP_ID =
{
	LIST    : 0,
	VERSION : 1,
	TEST    : 2,  
	TIME    : 3,
	VIDEO  : 4,
	AUDIO  : 5,
	NAVIG  : 6, 
	CAN1   : 7,
	CAN2   : 8,
	CAN3   : 9,
	CAN4   : 10,
	CAN5   : 11,
	STOPCAN1  : 12,
	STOPCAN2  : 13,
	STOPCAN3  : 14,
	STOPCAN4  : 15,
	STOPCAN5  : 16,
	DEMO : 17
};

// Enum 
var CMD_Names =
{
	VIDEO  : 'VIDEO',
	AUDIO  : 'AUDIO',
	NAV		: 'NAV', 
	CAN1   : 'CAN1',
	CAN2   : 'CAN2',
	CAN3   : 'CAN3',
	CAN4   : 'CAN4',
	CAN5   : 'CAN5'
};
const LOG_INFO = 1;
const LOG_WARNING = 2;
const LOG_ERR = 3;
const LOG_EXCEPTION = 4;
const LOG_SUCCESS= 5;
const LOG_ON_MESSAGE= 6;
const LOG_SEND= 7;
const LOG_CREATE= 8;


// variables for all HTML elements used and defined in 'index.html' file (for further DOM manipulation)
var he_RADOME_Log_Ws_Main = '#RADOME_LOG_WS_MAIN';
var he_RADOME_Log_Ws_CAN = '#RADOME_LOG_WS_CAN';
var he_RADOME_Log_Ws_VIDEO = '#RADOME_LOG_WS_VIDEO';
var he_RADOME_Log_Ws_AUDIO = '#RADOME_LOG_WS_AUDIO';
var he_RADOME_Log_Ws_NAV = '#RADOME_LOG_WS_NAV';

var he_WS_Main = '#WS_Main_button';
var he_WS_CAN = '#WS_CAN_button';
var he_WS_VIDEO = '#WS_VIDEO_button';
var he_WS_AUDIO = '#WS_AUDIO_button';
var he_WS_NAV = '#WS_NAV_button';

var he_Btn_WSLogMain_Clear = '#Btn_WSLogMain_Clear';
var he_Btn_WSLogCAN_Clear = '#Btn_WSLogCAN_Clear';
var he_Btn_WSLogVIDEO_Clear = '#Btn_WSLogVIDEO_Clear';
var he_Btn_WSLogAUDIO_Clear = '#Btn_WSLogAUDIO_Clear';
var he_Btn_WSLogNAV_Clear = '#Btn_WSLogNAV_Clear';

var he_MP3_audio_section1 = '#MP3_audio_section1';
var he_mediawrapper = '#mediawrapper';
var he_RADOME_dbg = '#RADOME_dbg';

var he_SelectRADOMECmds = '#SelectRADOMECmds';
var he_SelectRADOMEAudio = '#SelectRADOMEAudio';
var he_RADOME_Server_Info = $("#RADOME_Server_Info");

var he_SendButton = '#Btn_send';

var he_menu2 = '#menu2';
var he_menu3 = '#menu3';
var he_menu4 = '#menu4';
var he_menu5 = '#menu5';
var he_txtToSend = '#text_to_send';

var he_leftPanel = '#left_panel';
var he_rightPanel = '#right_panel';
var he_Btn_lp  = '#Btn_lp';
var he_Btn_rp  = '#Btn_rp';
 
var he_BtnDebug  = '#MenuBtnDebug';
var he_debug_header_panel = "#debug_header_panel";
var he_BtnClearMapMarkers =  '#BtnClearMapMarkers';

var he_BtnDispMap =  '#BtnDispMap';
var he_pointers_map =  '#pointers_map';

function f_clear(he_what_to_clear){
	$(he_what_to_clear).empty();
}
	
function fAlertFunction(someValue) {
  alert(this.id + " - " + someValue);
}

/************************************************************************************
[Function name]	f_addMsgTo
[Description]	function to append messages received into the specifeid HTML element
[inputs]		
			HTML_elem : the HTML element where to add the message
			msg : string message to be added to 
			enable : boolean to define if this message must be added (false:not added, true:added)
			logType : type (enum) of log to be inserted
[jQuery]		YES
*************************************************************************************/
function f_addMsgTo(HTML_elem, msg, logType, enable){

	// tag variables to be used
	var tag_p_begin;
	var tag_p_begin_warning ='<p class="alert alert-warning alert-dismissable radius ico_warning tiny2"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">  &times; </button>';
	var tag_p_begin_info ='<p class="alert alert-info alert-dismissable radius ico_up tiny2"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">  &times; </button>';
	var tag_p_begin_err ='<p class="alert  alert-danger alert-dismissable radius ico_ws_status tiny2"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">  &times; </button>';
	var tag_p_begin_exception ='<p class="alert alert-dismissable radius ico_exception tiny2"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times; </button>';
	var tag_p_begin_success = '<p class="alert  alert-success alert-dismissable radius ico_ws_status tiny2"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times; </button>';
	
	var tag_p_end ='</p>';
	
	var tag_p_begin_onmessage = '<p class="alert alert-success alert-dismissable radius ico_down tiny2"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times; </button>';
	var tag_p_begin_send = '<p class="alert alert-info alert-dismissable radius ico_up tiny2"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times; </button>';
	var tag_p_begin_create ='<p class="alert alert-info alert-dismissable radius ico_ws_status tiny2"> <button type="button" class="close" data-dismiss="alert" aria-hidden="true">  &times; </button>';
	
	// checked 'enable' is true
	if (enable === true){

		switch(logType) // inspect logType found to build the appropriate html elem to be appended
		{
			case LOG_WARNING:
				tag_p_begin = tag_p_begin_warning;
				break;
			case LOG_INFO:
				tag_p_begin = tag_p_begin_info;
				break;
			case LOG_ERR:
				tag_p_begin = tag_p_begin_err;
				break;
			case LOG_EXCEPTION:
				tag_p_begin = tag_p_begin_exception;
				break;
			case LOG_SUCCESS:
				tag_p_begin = tag_p_begin_success;
				break;		
			case LOG_ON_MESSAGE:
				tag_p_begin = tag_p_begin_onmessage;
				break;							
			case LOG_SEND:
				tag_p_begin = tag_p_begin_send;
				break;		
			case LOG_CREATE:
				tag_p_begin = tag_p_begin_create;
				break;						
				
			default:
				tag_p_begin = tag_p_begin_info;
				break;
		}	
	
		$(HTML_elem).append(tag_p_begin + msg + tag_p_end);
	}
}


function f_SendToSpecificWS(fText){
	switch(fText)
	{
		case CMD_Names.CAN1:
			if(bWsState_Can1 != true )
			{
				f_WS_send(gRADOME_Conf.Websocket.CAN1);
				bWsState_Can1 = true;
			}
			else 
				f_WS_send(gRADOME_Conf.Websocket.MAIN);
			bWsState_Can1 = false;
			break;
		case CMD_Names.CAN2:
			if(bWsState_Can2 != true )
			{
				f_WS_send(gRADOME_Conf.Websocket.CAN2);
				bWsState_Can2 = true;
			}
			else 
				f_WS_send(gRADOME_Conf.Websocket.MAIN);
			bWsState_Can2 = false;
		break;
		case CMD_Names.CAN3:
			if(bWsState_Can3 != true )
			{
				f_WS_send(gRADOME_Conf.Websocket.CAN3);
				bWsState_Can3 != true;
			}
			else 
				f_WS_send(gRADOME_Conf.Websocket.MAIN);
			bWsState_Can3 = false;
			break;
		case CMD_Names.CAN4:
			if(bWsState_Can4 != true )
			{
				f_WS_send(gRADOME_Conf.Websocket.CAN4);
				bWsState_Can4 = true;
			}
			else 
				f_WS_send(gRADOME_Conf.Websocket.MAIN);
			bWsState_Can4 = false;
			break;
		case CMD_Names.CAN5:
			if(bWsState_Can5 != true )
			{
				f_WS_send(gRADOME_Conf.Websocket.CAN5);
				bWsState_Can5 = true;
			}
			else 
				f_WS_send(gRADOME_Conf.Websocket.MAIN);
			bWsState_Can5 = false;				
			break;
		case CMD_Names.VIDEO:
			if(bWsState_VIDEO != true )
			{
				f_WS_send(gRADOME_Conf.Websocket.VIDEO);
				bWsState_VIDEO = true;
			}
			else 
				f_WS_send(gRADOME_Conf.Websocket.MAIN);
			bWsState_VIDEO = false;
			break;
		case CMD_Names.AUDIO:
			if(bWsState_AUDIO != true )
			{
				f_WS_send(gRADOME_Conf.Websocket.AUDIO);
				bWsState_AUDIO = true;
			}
			else 
				f_WS_send(gRADOME_Conf.Websocket.MAIN);
			bWsState_AUDIO = false;
			break;
		case CMD_Names.NAV:
			if(bWsState_NAV != true )
			{
				f_WS_send(gRADOME_Conf.Websocket.NAV);
				bWsState_NAV =true;
			}
			else 
				f_WS_send(gRADOME_Conf.Websocket.MAIN);
			bWsState_NAV = false;
			break;
		default:
			f_WS_send(gRADOME_Conf.Websocket.MAIN);
		break;
	}
}

function f_behav_TxtInput(event){
	// Check that the text we want to send is defined and not empty
	if ( text_to_send.value != 'undefined' && text_to_send.value != '' )
	{
		switch(event.keyCode)
		{
			case 13: // return key pressed
				gScope.$apply(function(){
					if (gScope.RADOME_SentCmdHistory.length < gScope.RADOME_MAX_CmdHistory )
					{
						gScope.RADOME_SentCmdHistory.push(
						{ numCmd: gScope.RADOME_SentCmdHistory.length, cmdText: text_to_send.value, source: "TxtInputENTER"}
						);
					}
					else
					{
						gScope.RADOME_SentCmdHistory.shift();
						gScope.RADOME_SentCmdHistory.push(
						{ numCmd: gScope.RADOME_SentCmdHistory.length, cmdText: text_to_send.value, source: "SendButton"}
						);
					}
				})	
				//Command must be sent over specified Websocket
				f_SendToSpecificWS(text_to_send.value);
				break;
			
			case 37: //  key left
			case 38: //  key up
			case 60://  key up
				break;
			
			case 39: //  key right
			case 40: //  key down
			case 62:// 
				break;
				
			default: //   
				break;
		}// end switch
	}// end if
}

function f_behav_SendButton(event){    
	// Check that the text we want to send is defined and not empty
	if ( text_to_send.value != 'undefined' && text_to_send.value != '')
	{
		// Update 'gScope' object 
		gScope.$apply(function(){
			if (gScope.RADOME_SentCmdHistory.length < gScope.RADOME_MAX_CmdHistory )
			{
				gScope.RADOME_SentCmdHistory.push(
					{ numCmd: gScope.RADOME_SentCmdHistory.length, cmdText: text_to_send.value, source: "SendButton"}
				);
			}
			else
			{
				gScope.RADOME_SentCmdHistory.shift();
				gScope.RADOME_SentCmdHistory.push(
					{ numCmd: gScope.RADOME_SentCmdHistory.length, cmdText: text_to_send.value, source: "SendButton"}
				);
			}
		})	
		//Command must be sent over specified Websocket
		f_SendToSpecificWS(text_to_send.value);
	}

}
function f_GUI_Update_Version(frame){
	// Update 'gScope' object with data found with 'frame'
    gScope.$apply(function(){
       $.each(frame.RADOME_VersionInfo, function(key, val){
			gScope.versionInfo.release = val.versionRelease;
			gScope.versionInfo.buildDate = val.versionBuildDate;
			gScope.versionInfo.buildTime = val.versionBuildTime;
			gScope.versionInfo.LWS_version = val.versionLWS;
		})	
    })
	// Show elements for RADOME Server Info
	he_RADOME_Server_Info.show();
}

function f_GUI_Update_Demo(frame){
	// Update 'gScope' object with data found with 'frame'
    gScope.$apply(function(){
       $.each(frame.RADOME_DemoInfo, function(key, val){
			var boot_pbclass="";
			gScope.demoInfo.values[key] = val.value;
			gScope.demoInfo.labels[key] = val.label;
			
			if (gScope.RADOME_DemoInfo.length < gScope.RADOME_MAX_DemoInfo )
			{
				if( val.value >=0 && val.value < 30)
					boot_pbclass = "progress-bar-info";
				else if( val.value >=30 && val.value < 60) 
					boot_pbclass = "progress-bar-success";
				else if( val.value >=60 && val.value < 90) 
					boot_pbclass = "progress-bar-warning";
				else 
					boot_pbclass = "progress-bar-danger";					
				gScope.RADOME_DemoInfo.push({ idx: key, value: val.value, label: val.label, pbclass:boot_pbclass});
			}
		})	
    })
}

function f_GUI_Update_Nav(frame){
	// Update 'gScope' object with data found with 'frame'
    gScope.$apply(function(){
       $.each(frame.RADOME_NAV_Data, function(key, val){
			gScope.NAV_Data.lat = val.lat;
			gScope.NAV_Data.lng = val.lng;
			gScope.NAV_Data.title = val.title;
			gScope.NAV_Data.infoWindow.content = val.infoWindow.content;
		})	
    })
	//console.log(gScope.NAV_Data);
	// Add marker to the Google map HTML element
	map.addMarker(gScope.NAV_Data);
}

/************************************************************************
[Function name]	f_ProcessJSONData_Main
[Description]	function to analyse input frame data in order to execute
				the appropriate processing
[inputs]		frame : frame to be processed
[jQuery]		NO
*************************************************************************/					
function f_ProcessJSONData_Main(frame){
	//	log AppID received			
	//f_RADOME_log(frame.AppID);
	//Check AppID and do what fit with that
	var id = parseInt(frame.AppID);
	switch(id) // inspect id found to dispatch the appropriate processing
	{
		case APP_ID.LIST:
			//  load JSON data (into 'frame') to update and fill the select '$(he_SelectRADOMECmds)'
			f_GUI_Update_Select(frame, $(he_SelectRADOMECmds));	
			break;
		
		case APP_ID.VERSION:
			//  load data json to populate the angular model "$scope.versionInfo" 
			f_RADOME_log("load data json to populate the angular model $scope.versionInfo");
			f_GUI_Update_Version(frame);	
			break;	
			
		// if process is "CAN"
		case APP_ID.CAN1:
		case APP_ID.CAN2:
		case APP_ID.CAN3:
		case APP_ID.CAN4:
		case APP_ID.CAN5:
			//Update GUI for the 'gauge' element
			f_ProcessJSONData_CAN(frame);	
			// TO DO : simulate click on concerned tab menu
			//$("#menu2").click();
			break;

		case APP_ID.VIDEO:
			// Update GUI elements concerned 
			
			// TO DO : simulate click on concerned tab menu
			//$("#menu3").click();
			break;
		
		case APP_ID.AUDIO:
			// Update GUI elements concerned 
			f_GUI_Update_Select(frame, $(he_SelectRADOMEAudio));	
			// TO DO : simulate click on concerned tab menu
			//$("#menu4").click();
			break;
		
		case APP_ID.NAVIG:
			// Update GUI elements concerned 
			// TO DO : simulate click on concerned tab menu
			//$("#menu5").click();
		
			f_RADOME_log("load data json to populate the angular model $scope.RADOME_NavigInfo");
			f_GUI_Update_Nav(frame);	
			break;

		case APP_ID.DEMO:
			//  load data json to populate the angular model "$scope.RADOME_DemoInfo" 
			f_RADOME_log("load data json to populate the angular model $scope.RADOME_DemoInfo");
			f_GUI_Update_Demo(frame);	
			break;	
			
		default:
			// unknown id
			f_RADOME_log("Unknown APP ID found : " + frame.AppID);
			break;
	}
}

/************************************************************************
[Function name]	f_ProcessJSONData_CAN
[Description]	function to analyse input frame data in order to execute
				the appropriate processing
[inputs]		frame_can : frame to be processed
[jQuery]		NO
*************************************************************************/	
function f_ProcessJSONData_CAN(frame_can){
	//Check AppID and do what fit with that
	var id = parseInt(frame_can.AppID);

	switch(id)
	{
		case APP_ID.CAN1:
			//Update GUI for the 'gauge' element
			gauge.setValue(frame_can.DataValue);
			gauge.draw();	
			gRADOME_Conf.GUI_BarGraph[0] = frame_can.DataValue;
			f_JSONDraw_Graph_CAN(gRADOME_Conf.GUI_BarGraph);

			break;

		case APP_ID.CAN2:
			// Update GUI elements concerned 
			gRADOME_Conf.GUI_BarGraph[1] = frame_can.DataValue;
			f_JSONDraw_Graph_CAN(gRADOME_Conf.GUI_BarGraph);

			break;
		
		case APP_ID.CAN3:
			// Update GUI elements concerned 
			gRADOME_Conf.GUI_BarGraph[2] = frame_can.DataValue;
			f_JSONDraw_Graph_CAN(gRADOME_Conf.GUI_BarGraph);

			break;
		
		case APP_ID.CAN4:
			// Update GUI elements concerned 
			gRADOME_Conf.GUI_BarGraph[3] = frame_can.DataValue;
			f_JSONDraw_Graph_CAN(gRADOME_Conf.GUI_BarGraph);

			break;
		
		case APP_ID.CAN5:
			gRADOME_Conf.GUI_BarGraph[4] = frame_can.DataValue;
			f_JSONDraw_Graph_CAN(gRADOME_Conf.GUI_BarGraph);
			break;	
	
		default:
			// unknown id
			f_RADOME_log("Unknown APP ID found : " + frame_can.AppID);
			break;	
	}
}

/************************************************************************
[Function name]	f_WS_send
[Description]	function to perform data sending over the websocket connection.
[inputs]		fWS : the websocket object config used for sendings
[jQuery]		YES
*************************************************************************/	
function f_WS_send(fWS)
{
	// message variables to be used
	var Warning_no_msg = 'Please enter a message !';
	var SendOK_msg = "Sent : '";
	var SendKO_msg = 'Error while sending:';
	var Exception_msg = 'Exception in "f_WS_send" raised:';
	
	var wsToLog = he_RADOME_Log_Ws_Main;
	var heToUpdate = $(he_WS_Main);
		
	// Get text value from input
	var text = $(he_txtToSend).val();
	// Check if empty or not
	if(text==""){
		f_addMsgTo( he_RADOME_Log_Ws_Main,
					Warning_no_msg, LOG_WARNING,
					go_RADOME_Conf.getAddLog_Warning() );
		return ;
	}
	
	try{ // Sending to websocket is OK
		fWS.Websocket.send(text);
		
		// Updating variables concerned for further use
		switch(fWS.name)
		{
			case "MAIN":
				wsToLog = he_RADOME_Log_Ws_Main;
				heToUpdate = $(he_WS_Main);
			break;
			case "CAN1":
			case "CAN2":			
			case "CAN3":
			case "CAN4":	
			case "CAN5":	
				wsToLog = he_RADOME_Log_Ws_CAN;
				heToUpdate = $(he_WS_CAN);
			break;
			case "AUDIO":
				wsToLog = he_RADOME_Log_Ws_AUDIO;
				heToUpdate = $(he_WS_AUDIO);
			break;
			case "VIDEO":
				wsToLog = he_RADOME_Log_Ws_VIDEO;
				heToUpdate = $(he_WS_VIDEO);
			break;	
			case "NAV":
				wsToLog = he_RADOME_Log_Ws_NAV;
				heToUpdate = $(he_WS_NAV);
			break;					
			default:
				wsToLog = he_RADOME_Log_Ws_Main;
				heToUpdate = $(he_WS_Main);
			break;
		}
			heToUpdate.removeClass('btn-warning');
			heToUpdate.removeClass('btn-info');
		// adding to the appropriate Log HTML element
		f_addMsgTo(	wsToLog,
					SendOK_msg + text +"'", LOG_SEND,
					go_RADOME_Conf.getAddLog_Send() );
		heToUpdate.addClass('btn-info');
	} 

	catch(exception){ // Sending to websocket has encountered a problem
		// adding to the appropriate Log HTML element
		f_addMsgTo( wsToLog,
					SendKO_msg + text, LOG_EXCEPTION,
					go_RADOME_Conf.getAddLog_Send());
		f_addMsgTo( wsToLog,
					Exception_msg + exception, LOG_EXCEPTION,
					go_RADOME_Conf.getAddLog_Exception());
		// adding the css bootstrap visual class to see error
			heToUpdate.addClass('btn-warning');
	}
	// Clear input text field ( empty string )
	$(he_txtToSend).val("");
}

function f_BindFunctionsToHTMLElements() {
	// hide elements for RADOME Server Info
	he_RADOME_Server_Info.hide();
	
	// For selecting RADOME commands on the select
	$(he_SelectRADOMECmds).bind('change',  function() {
	  f_GetSelectionAndSend(this);
	});
	// For selecting RADOME audio on the select
	$(he_SelectRADOMEAudio).bind('change',  function() {
	  f_GetSelectionAndPlay(this);
	});	
	
	
	// Functions to clear log panels
	$(he_Btn_WSLogMain_Clear).bind('click', { name: he_RADOME_Log_Ws_Main }, function(event) {
		var data = event.data;
		f_clear(data.name);
	});
	$(he_Btn_WSLogCAN_Clear).bind('click', { name: he_RADOME_Log_Ws_CAN }, function(event) {
		var data = event.data;
		f_clear(data.name);
	});
		$(he_Btn_WSLogVIDEO_Clear).bind('click', { name: he_RADOME_Log_Ws_VIDEO }, function(event) {
		var data = event.data;
		f_clear(data.name);
	});
		$(he_Btn_WSLogAUDIO_Clear).bind('click', { name: he_RADOME_Log_Ws_AUDIO }, function(event) {
		var data = event.data;
		f_clear(data.name);
	});
		$(he_Btn_WSLogNAV_Clear).bind('click', { name: he_RADOME_Log_Ws_NAV }, function(event) {
		var data = event.data;
		f_clear(data.name);
	});
	// Restore default values of form elements
	$("#btnDefaultConf").click(function () {
		$("#RadomeConf_txtBox").val("getDefaultConf");

	   $('#RADOME_Conf').find("input:checkbox").val(go_RADOME_Conf.getDefaultConf()); 
           // Get the multiple selected checkbox items
            var chk = [];
            $("input:checkbox:checked").each(function() {
                chk.push($(this).val());
            });
			//print it
            $("#para").html(
                $("#RadomeConf_txtBox").val() + "<br/>" +
                $("input:radio[name=rad]:checked").val() + "<br/>" +
                chk.join(",") + "<br/>" +
                $("#selectbox").val()
             );
	});
	
	// Get current config (of form elements)
    $("#btnGetConf").click(function () {
		$("#RadomeConf_txtBox").val("getCompleteConf");

		$('#RADOME_Conf').find("input:checkbox").val(go_RADOME_Conf.getCompleteConf()); 

		$("#btnSaveConf").removeAttr('disabled');
		$("#btnDefaultConf").removeAttr('disabled');
		$( "#RADOME_Conf_form" ).toggle();
		// Get the multiple selected checkbox items
            var chk = [];
            $("input:checkbox:checked").each(function() {
                chk.push($(this).val());
            });
        });
		
    // Save config values (of form elements)
    $("#btnSaveConf").click(function () {
			//set all go_RADOME_Conf params to false
			go_RADOME_Conf.setDebugMode(false);
			go_RADOME_Conf.setConsoleLog(false);
			go_RADOME_Conf.setAddLog_Create(false);
			go_RADOME_Conf.setAddLog_OnOpen(false);
			go_RADOME_Conf.setAddLog_OnError(false);
			go_RADOME_Conf.setAddLog_OnMessage(false);
			go_RADOME_Conf.setAddLog_OnClose(false);
			go_RADOME_Conf.setAddLog_Exception(false);
			go_RADOME_Conf.setAddLog_Warning(false);
			go_RADOME_Conf.setAddLog_Send(false);
		
            // first get the multiple selected checkbox items
            var chk = []; var val;
            $("input:checkbox:checked").each(function() {
                chk.push($(this).val());
				f_RADOME_log($(this).val());

			// set true for the checked input checkbox found
			switch($(this).val())
			{	
				case "DebugMode":
					go_RADOME_Conf.setDebugMode(true);
					break;
				case "ConsoleLog":
					go_RADOME_Conf.setConsoleLog(true);
					break;					
				case "AddLog_Create":
					go_RADOME_Conf.setAddLog_Create(true);
					break;
				case "AddLog_OnOpen":
					go_RADOME_Conf.setAddLog_OnOpen(true);
					break;	
				case "AddLog_OnError":
					go_RADOME_Conf.setAddLog_OnError(true);
					break;
				case "AddLog_OnMessage":
					go_RADOME_Conf.setAddLog_OnMessage(true);
					break;	
				case "AddLog_OnClose":
					go_RADOME_Conf.setAddLog_OnClose(true);
					break;
				case "AddLog_Exception":
					go_RADOME_Conf.setAddLog_Exception(true);
					break;	
				case "AddLog_Warning":
					go_RADOME_Conf.setAddLog_Warning(true);
					break;
				case "AddLog_Send":
					go_RADOME_Conf.setAddLog_Send(true);
					break;	
				default :
					f_RADOME_log(chk[val] + " is not known!");
					break;
			}
		});
			
		f_RADOME_log(go_RADOME_Conf.getCompleteConf());					

	});
  	
	// Toggle or not the 'he_RADOME_Log_Ws_Main' log element
	$(he_WS_Main).bind( "click", function() {
		$(he_RADOME_Log_Ws_Main).toggle(100);
	});
	$(he_WS_CAN).bind( "click", function() {
		$(he_RADOME_Log_Ws_CAN).toggle(100);
	});
	$(he_WS_VIDEO).bind( "click", function() {
		$(he_RADOME_Log_Ws_VIDEO).toggle(100);
	});
	$(he_WS_AUDIO).bind( "click", function() {
		$(he_RADOME_Log_Ws_AUDIO).toggle(100);
	});
	$(he_WS_NAV).bind( "click", function() {
		$(he_RADOME_Log_Ws_NAV).toggle(100);
	});
	
	$('#btnGetConf').on('click', function() {
            bootstrap_alert.info('btnGetConf : Configuration has been loaded');
	});
	$('#btnDefaultConf').on('click', function() {
            bootstrap_alert.warning('btnDefaultConf : Configuration has been restored with default');
	});
	$('#btnSaveConf').on('click', function() {
            bootstrap_alert.success('btnSaveConf : Configuration has been saved');
	});	
	// Toggle or not the 'he_MP3_audio_section1' element
		$(he_MP3_audio_section1).click(function(){
		$(he_mediawrapper).toggle(100);
	});
	// Toggle or not the 'he_Btn_lp' log element
	$(he_Btn_lp).bind( "click", function() {
		$(he_leftPanel).toggle(100);
	});
	// Toggle or not the 'he_Btn_rp' log element
	$(he_Btn_rp).bind( "click", function() {
		$(he_rightPanel).toggle(100);
	});
	// Toggle or not the 'he_debug_header_panel' elements
	$(he_BtnDebug).bind( "click", function() {
		$(he_debug_header_panel).toggle(100);
	});	

	$(he_BtnClearMapMarkers).bind( "click", function() {
		map.removeMarkers();
	});		

	$(he_BtnDispMap).bind( "click", function() {
		$(he_pointers_map).toggle(100);
	});			
	
	
}

/************************************************************************
[Function name]	f_WS_Connect
[Description]	function to perform connection establishment over Websockets .
[inputs]		fWS : the Websocket object configuration used to init websockets
[jQuery]		YES
*************************************************************************/	
function f_WS_Connect(fWS)
{	
	var WS_Create_msg = '[Websocket '+fWS.name+']:(Create)-readyState=';
	var WS_OnOpen_msg = '[Websocket '+fWS.name+']:(OnOpen)-readyState=';
	var WS_OnError_msg = '[Websocket '+fWS.name+']:(OnError)-readyState=';
	var WS_OnMessage_msg = '(OnMessage): ';
	var WS_OnClose_msg = '[Websocket '+fWS.name+']:(OnClose)-readyState=';
	var WS_Exception_msg = 'Exception in "f_WS_Connect" detected:';
	
	var wsToLog = he_RADOME_Log_Ws_Main;
	var heToUpdate = $(he_WS_Main);
		
	// Updating variables concerned for further use
	switch(fWS.name)
	{
		case "MAIN":
			wsToLog = he_RADOME_Log_Ws_Main;
			heToUpdate = $(he_WS_Main);
		break;
		case "CAN1":
		case "CAN2":			
		case "CAN3":
		case "CAN4":	
		case "CAN5":	
			wsToLog = he_RADOME_Log_Ws_CAN;
			heToUpdate = $(he_WS_CAN);
		break;
		case "AUDIO":
			wsToLog = he_RADOME_Log_Ws_AUDIO;
			heToUpdate = $(he_WS_AUDIO);
		break;
		case "VIDEO":
			wsToLog = he_RADOME_Log_Ws_VIDEO;
			heToUpdate = $(he_WS_VIDEO);
		break;	
		case "NAV":
			wsToLog = he_RADOME_Log_Ws_NAV;
			heToUpdate = $(he_WS_NAV);
		break;					
		default:
			wsToLog = he_RADOME_Log_Ws_Main;
			heToUpdate = $(he_WS_Main);
		break;
	}
		
	try{ 
		// creation of Websocket
		fWS.Websocket = new WebSocket(fWS.webSocketUrl ,fWS.webSocketProtocol);
		// adding 'creation' event to WS_Log HTML element
		f_addMsgTo(	wsToLog,
				WS_Create_msg + fWS.Websocket.readyState , LOG_CREATE,
				go_RADOME_Conf.getAddLog_Create() );
		// defining 'onOpen' method for current Websocket
		fWS.Websocket.onopen = function(){
		// adding 'onOpen' event to WS_Log HTML element
		f_addMsgTo(	wsToLog,
				WS_OnOpen_msg + fWS.Websocket.readyState , LOG_SUCCESS,
				go_RADOME_Conf.getAddLog_OnOpen() );
				// adding the css  bootstrap visual class to see success
				heToUpdate.addClass('btn-success');
		};

		// defining 'onError' method for current Websocket
		fWS.Websocket.onerror = function () {
		// adding 'onError' event to WS_Log HTML element
		f_addMsgTo(	wsToLog,
				WS_OnError_msg + fWS.Websocket.readyState , LOG_ERR,
				go_RADOME_Conf.getAddLog_OnError() );
				// adding the css bootstrap visual class to see error
				heToUpdate.removeClass('btn-success');
				heToUpdate.addClass('btn-danger');
		};

		// defining 'onMessage' method for current Websocket
		fWS.Websocket.onmessage = function(msg){
			f_RADOME_log('[Websocket.onmessage] '+fWS.name+' :' + msg.data);
			// adding 'onMessage' event to WS_Log HTML element
			f_addMsgTo(	wsToLog,
					WS_OnMessage_msg +msg.data, LOG_ON_MESSAGE,
					go_RADOME_Conf.getAddLog_OnMessage() );
			
			// test if we get JSON format (and so if OK to be parsed)
			var isJSON=true; 
			
			try {
				//Retrieve JSON data from 'msg.data' received on the websocket
				my_JSON_DataReceived = JSON.parse(msg.data);
			} catch (err) {
				//if (trace_on===true) console.error("No JSON data found"); 
				isJSON=false;
			}		  
			// Check if JSON format was found
			if (isJSON == false){
				// Not JSON format
				f_RADOME_log('No JSON data found');
			}
			else{
				//correct JSON format found
				f_ProcessJSONData_Main(my_JSON_DataReceived);
			}
		};
		// defining 'onClose' method for current Websocket  
		fWS.Websocket.onclose = function(){
			// adding 'onClose' event to WS_Log HTML element
			f_addMsgTo(	wsToLog,
					WS_OnClose_msg+ fWS.Websocket.readyState, LOG_ERR,
					go_RADOME_Conf.getAddLog_OnClose() );
			// adding the css bootstrap visual class to see error
				heToUpdate.removeClass('btn-success');
				heToUpdate.addClass('btn-danger');
		};  
		// Adding event to listen when closing window -> force to close the 'fWS' object
		// this should be triggered when the browser tab is closed (or address changed)
		window.addEventListener("beforeunload", function() {
			f_CloseWebsocket(fWS) 
		});

	} 
	catch(exception){
		// adding 'exception' event to WS_Log HTML element
		f_addMsgTo(	wsToLog,
					WS_Exception_msg + exception, LOG_EXCEPTION,
					go_RADOME_Conf.getAddLog_Exception() );
			// adding the css bootstrap visual class to see error
				heToUpdate.removeClass('btn-success');
				heToUpdate.addClass('btn-warning');
	}
	
	//	Detect enter press on input text '#he_txtToSend'
	$(he_txtToSend).keypress(f_behav_TxtInput);  
	//	Detect click press on button '#he_SendButton'
	$(he_SendButton).click( f_behav_SendButton )
	
	// Stop button
	$('#STOP').click(
	function(e){
		// send stop command over main websocket 
		gRADOME_Conf.Websocket.MAIN.Websocket.send("STOP");
	});
}//End f_WS_Connect

function f_LoadOnDocumentReady(){

	gScope = angular.element($("#html")).scope();
	
	var WS_debug_status_0 = 	$("#WS_debug_status_0");
	var WS_debug_url_0 =  		$("#WS_debug_url_0");
	var WS_debug_protocol_0 = 	$("#WS_debug_protocol_0");
	var WS_debug_connect_0 =  	$("#WS_debug_connect_0");
	var WS_debug_disconnect_0 = $("#WS_debug_disconnect_0");
	var WS_debug_send =  		$("#WS_debug_send");
	var WS_debug_text =  		$("#WS_debug_text");
	var WS_debug_msg =  		$("#WS_debug_msg");
	var socket;
	
	

	// Setting default values form inputs
	WS_debug_status_0.text("Not Connected");
	WS_debug_status_0.toggleClass("label-danger");
	WS_debug_url_0.val(gRADOME_Conf.Websocket.MAIN.webSocketUrl);	
	WS_debug_protocol_0.val(gRADOME_Conf.Websocket.MAIN.webSocketProtocol);

	WS_debug_disconnect_0.prop('disabled', true);
	WS_debug_send.prop('disabled', true);
	WS_debug_text.prop('disabled', true);
	// Create a new connection when the Connect button is clicked
	WS_debug_connect_0.bind("click", function(event) {
		WS_debug_connect_0.prop('disabled', true);
		if (WS_debug_protocol_0.val() == "")
		{
			socket = new WebSocket(WS_debug_url_0.val());
		}
		else
		{
			socket = new WebSocket(WS_debug_url_0.val(),  WS_debug_protocol_0.val());
		}

		/*
		// adding event to listen when closing window -> force to close the 'socket' object
		// this should be triggered when the browser tab is closed (or address changed)
		window.addEventListener("beforeunload", function() {
			f_CloseWebsocket(socket) 
		});
		*/	
		socket.addEventListener("open", function(event) {
			WS_debug_disconnect_0.prop('disabled', false);
			WS_debug_send.prop('disabled', false);
			WS_debug_text.prop('disabled', false);
			WS_debug_status_0.text("Connected");
			WS_debug_status_0.toggleClass("label-success");
			WS_debug_status_0.toggleClass("label-danger");
		});

		// Display messages received from the server
		socket.addEventListener("message", function(event) {
		  WS_debug_msg.val(event.data);
		});

		// Display any errors that occur
		socket.addEventListener("error", function(event) {
		  WS_debug_msg.val("Error: " + event);
		  		  WS_debug_status_0.text("Error");
		  WS_debug_status_0.toggleClass("label-danger");
		});

		socket.addEventListener("close", function(event) {
		  WS_debug_connect_0.prop('disabled', false);
		  WS_debug_status_0.text("Not Connected");
			WS_debug_status_0.toggleClass("label-success");
			WS_debug_status_0.toggleClass("label-danger");
		});
	});

	WS_debug_disconnect_0.bind("click", function(event) {
		WS_debug_disconnect_0.prop('disabled', true);
			WS_debug_send.prop('disabled', true);
			WS_debug_text.prop('disabled', true);
		WS_debug_msg.val("");
		socket.close();
	});

	WS_debug_send.bind("click", function(event) {
	socket.send(WS_debug_text.val());
	WS_debug_text.val("");
	});

	// Call and set all binding relative to used HTML element in web page
    f_BindFunctionsToHTMLElements();
	// Check if Debug 
	if (!go_RADOME_Conf.getDebugMode()){
		$(he_debug_header_panel).hide();

	}
	else{
		$(he_RADOME_Log_Ws_Main).hide();
	}
	// selectpicker
	$('.selectpicker').selectpicker({
		'selectedText': 'cat'
	});

    $(he_SelectRADOMECmds).selectpicker({
		'selectedText': 'cat'
	});  
    $(he_SelectRADOMEAudio).selectpicker({
		'selectedText': 'cat'
	}); 
	// Bootstrap tooltip for title project RADOME
	$('[data-toggle="tooltip"]').tooltip({
		'placement': 'bottom'
	});
	$('[data-toggle="popover"]').popover({
		trigger: 'hover',
			'placement': 'bottom'
	});

	// Check current browser supports WebSocket
	if(!("WebSocket" in window)){
		$('#RADOME_LOG_WS_MAIN, input, button, #examples').fadeOut("fast");
		$('<p>Oh no, you need a browser that supports WebSockets. How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
	}
	//The user has WebSockets
	else
	{  
		if (!go_RADOME_Conf.getDebugMode())
		{ // if Mode debug
			// Launch connexion to the main Websocket
			f_WS_Connect(gRADOME_Conf.Websocket.MAIN);
			// the menu 2 creates all "CAN" Websockets (1-5)
			$(he_menu2).click(function(e) {
				if( bMenuButtonCar != true )
				{
					f_WS_Connect(gRADOME_Conf.Websocket.CAN1);
					f_WS_Connect(gRADOME_Conf.Websocket.CAN2);
					f_WS_Connect(gRADOME_Conf.Websocket.CAN3);
					f_WS_Connect(gRADOME_Conf.Websocket.CAN4);
					f_WS_Connect(gRADOME_Conf.Websocket.CAN5);
					bMenuButtonCar =true;
				}
			});
			// the menu 3 creates 'Video' Websocket 	
			$(he_menu3).click(function(e) {
				if( bMenuButtonVideo != true )
				{
					f_WS_Connect(gRADOME_Conf.Websocket.VIDEO);
					bMenuButtonVideo =true;
				}
			});
			// the menu 4 creates 'Audio' websocket 		
			$(he_menu4).click(function(e) {
				if( bMenuButtonAudio != true )
				{
					f_WS_Connect(gRADOME_Conf.Websocket.AUDIO);
					bMenuButtonAudio =true;;
				}
			});
			// the menu 5 creates 'Nav' websocket 		
			$(he_menu5).click(function(e) {
				if( bMenuButtonNav != true )
				{
					f_WS_Connect(gRADOME_Conf.Websocket.NAV);
					bMenuButtonNav =true;;
				}
			});
		}	
	}
	
	
}

/************************************************************************
[Function name]	none
[Description]	Specify a function to execute when the DOM is fully loaded.
[inputs]		msg : string message to be added to 
[jQuery]		YES
-> more info : http://api.jquery.com/ready/
*************************************************************************/
$(document).ready(function(){

	f_LoadOnDocumentReady();
	// set size for canvas map
	 $(".map").css("width", 600).css("height", 400);
	 $("#pointers_map").css("margin", 5);

});

/************************************************************************
[Function name]	f_RADOME_log
[Description]	function to enable/disable log according 'ConsoleLog' 
[inputs]		smthg_to_log : string message to be logged 
[jQuery]		No
*************************************************************************/
function f_RADOME_log(smthg_to_log){
	if (go_RADOME_Conf.getConsoleLog()===true) 
	{
		console.log(smthg_to_log);
	}
}

/************************************************************************
[Function name]	f_CloseWebsocket
[Description]	function to close a websocket connexion 
[inputs]		fWS : websocket object concerned for closing 
[jQuery]		No
*************************************************************************/
function f_CloseWebsocket(fWS)
{
	// Check fWS object is defined and exists
	if (fWS != "undefined")
	{
		fWS.close();
		f_RADOME_log('Websocket "'+ fWS.name+ '" has been closed')
	}
}


/************************************************************************************
[Function name]	f_GUI_Update_Select
[Description]	function to update the select element
[inputs]		
			frame : data frame input
			he_select : html element type 'select'
[jQuery]		YES
*************************************************************************************/
function f_GUI_Update_Select(frame, he_select){
	// Check that the 'he_select' is found and correct
	if (he_select != null)
	{
		// Update GUI elements concerned 
		he_select.html(''); // Clear the content of the select
		
		// Determine what to inspect in frame
		var whatToInspect;
		switch(frame.AppID){
			case APP_ID.LIST:
				whatToInspect = frame.RADOME_Cmds;
				break;
			case APP_ID.AUDIO:
				whatToInspect = frame.RADOME_AudioFiles;
				break;				
			default :
				whatToInspect = frame.RADOME_Cmds;
				break;
		}
		
		// Iterate over the data and append a select option
		$.each(whatToInspect, function(key, val){
			// Append option element to the select
			he_select.append('<option value="' + val.id + '">' + val.name + '</option>');
			if (frame.AppID == APP_ID.AUDIO)
			{
				// Update structure array concerned
				gRADOME_Conf.AudioTitle.push(val.name);
				gRADOME_Conf.AudioPath.push(gScope.RADOMEAudioPath + val.name);
				gRADOME_Conf.AudioDescription.push("Description de "+val.name);
			}
		})	

		// Refresh element
		he_select.selectpicker('refresh');
	}
	else
	{
		f_RADOME_log("error in 'f_GUI_Update_Select' function : he_select is undefined");
	}
}


/*************************************************************************************
f_GetSelectionAndSend
[Description]	function to get the selection on a specific select/combo HTML element
				and then process it by simulating the sending from input text
[inputs]		
			select : the select on which the process will be applied

[jQuery]		YES
*************************************************************************************/
function f_GetSelectionAndSend(select) {
	var myValueSelected = select[select.selectedIndex].text;  	// store text found in the option value selected  
	// Get the input text HTML element 
	var text = $(he_txtToSend);
	// Set the input to value previously retrieved
	text.val(myValueSelected);
	// Force to simulate a click on a specific HTML element (using jQuery)
	$("#Btn_send").click();
}
function updateSource(source, src) {
    var source = $(source);
    source.attr('src', src).appendTo(source.parent());
}
	
function f_GetSelectionAndPlay(select) {
	var myValueSelected = select[select.selectedIndex].text;	// store text found in the option value selected  
	// Get the audio HTML element and update source attribute
	updateSource($("#RADOME_AudioPlayer"), gScope.RADOMEAudioPath + myValueSelected);
	
	// Display relative info 
	$("#RADOME_Audio_MetaInfo_title").html(gRADOME_Conf.AudioTitle[select.selectedIndex]);
	$("#RADOME_Audio_MetaInfo_path").html(gRADOME_Conf.AudioPath[select.selectedIndex]);
	$("#RADOME_Audio_MetaInfo_desc").html(gRADOME_Conf.AudioDescription[select.selectedIndex]);
}
/****************************************************************************************************
display_from_JSON() 
[Description]	function to display the conf
[inputs]		
			frame :

[jQuery]		YES
*************************************************************************************/
function display_from_JSON() {
	// get html element concerned
	$conf_to_display = $('#conf_to_display');

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
	// appends the result to the "conf_to_display" HTML element	
	$conf_to_display.append(regeStr);

}

bootstrap_alert = function() {}
/************************************************************************
[Function name]	bootstrap_alert.info
[Description]	
[inputs]		message :  
[jQuery]		Yes
*************************************************************************/
bootstrap_alert.info = function(message) {
            $('#RADOME_alert_placeholder').html('<div class="alert alert-info" role="alert"><a class="close" data-dismiss="alert">×</a><span>'
				+'<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>'
				+'<span class="sr-only">Info:</span>'
				+message+'</span></div>')
}
/************************************************************************
[Function name]	bootstrap_alert.warning
[Description]	
[inputs]		message :  
[jQuery]		Yes
*************************************************************************/
bootstrap_alert.warning = function(message) {
            $('#RADOME_alert_placeholder').html('<div class="alert alert-warning" role="alert"><a class="close" data-dismiss="alert">×</a><span>'
				+'<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>'
				+'<span class="sr-only">Warning:</span>'
				+message+'</span></div>')
}
/************************************************************************
[Function name]	bootstrap_alert.danger
[Description]	
[inputs]		message :  
[jQuery]		Yes
*************************************************************************/
bootstrap_alert.danger = function(message) {
            $('#RADOME_alert_placeholder').html('<div class="alert alert-danger" role="alert"><a class="close" data-dismiss="alert">×</a><span>'
				+'<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>'
				+'<span class="sr-only">Error:</span>'
				+message+'</span></div>')
}
/************************************************************************
[Function name]	bootstrap_alert.success
[Description]	
[inputs]		message :  
[jQuery]		Yes
*************************************************************************/
bootstrap_alert.success = function(message) {
            $('#RADOME_alert_placeholder').html('<div class="alert alert-success" role="alert"><a class="close" data-dismiss="alert">×</a><span>'
				+'<span class="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span>'
				+'<span class="sr-only">Success:</span>'
				+message+'</span></div>')
}

