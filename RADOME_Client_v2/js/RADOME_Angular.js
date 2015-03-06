/***********************************************
filename : RADOME_Angular.js 

this file contains the javascript code relative
to the Angular.js implementation used for the
RADOME project 
***********************************************/

// Including ngTranslate
angular.module( "ngTranslate", ["ng"]).config(
["$provide",function(t){$TranslateProvider=function(){var t,n={};
this.translations=function(t,r){if(!t&&!r)return n;if(t&&!r){if(angular.isString(t))return n[t];n=t}else n[t]=r},
this.uses=function(r){if(!r)return t;
if(!n[r])throw Error("$translateProvider couldn't find translationTable for langKey: '"+r+"'");t=r},
this.$get=["$interpolate","$log",function(r,a){return $translate=function(e,i){var l=t?n[t][e]:n[e];
return l?r(l)(i):(a.warn("Translation for "+e+" doesn't exist"),e)},
$translate.uses=function(n){return n?(t=n,void 0):t},$translate}]},
t.provider("$translate",$TranslateProvider)}])
,
angular.module("ngTranslate").directive("translate",["$filter","$interpolate",function(t,n){var r=t("translate");
return{restrict:"A",scope:!0,link:function(t,a,e)
{e.$observe("translate",function(r){t.translationId=angular.equals(r,"")?n(a.text())(t.$parent):r}),
e.$observe("values",function(n){t.interpolateParams=n}),t.$watch("translationId + interpolateParams",
function(){a.html(r(t.translationId,t.interpolateParams))})}}}])
,
angular.module("ngTranslate").filter("translate",["$parse","$translate",
function(t,n){return function(r,a){return angular.isObject(a)||(a=t(a)()),n(r,a)}}]);

// Create app component (Configuring module, asking for ngTranslate as dependency)
var RADOME_Module = angular.module('RADOME_Module', ['ngTranslate']);

// Configuring $translateProvider to manage translation inside the RADOME App
RADOME_Module.config(['$translateProvider', function ($translateProvider) {
    var lang_default = 'en_EN'; // set English as default language
	//defining English strings data
	var RADOME_language_en =
	{
		'RADOME_ClearLog': 'Clear log',
		
		'RADOME_Server_Info'		:	'ServerInfo',
		'RADOME_Server_release'		:	'Release',
		'RADOME_Server_buildDate'	:	'BuildDate',
		'RADOME_Server_buildTime'	:	'BuildTime',	
		'RADOME_Server_LWS_vers'	:	'C libwebsocket ver.',				
				
		'RADOME_ProjectName': 'RADOME',
		'RADOME_ProjectName_content': 'Remote Adaptive Display On Multiclient & Embedded',
		'RADOME_ChooseLang':'Choose language',

		'RADOME_DEBUG_WS_URL': 'URL',
		'RADOME_DEBUG_WS_Protocol': 'Protocol',
		'RADOME_DEBUG_BUTTON_WS_CONNECT': 'Connect',
		'RADOME_DEBUG_BUTTON_WS_DISCONNECT': 'Disconnect',
		'RADOME_DEBUG_BUTTON_WS_debug_send': 'Send',
		'RADOME_DEBUG_BUTTON_WS_debug_msg': 'Message',

		'RADOME_Help' : 'Need some help?',
		'RADOME_Help_msg' : 'type "list" or choose it in ServerCommands to retrieve a list of commands known by RADOME server',
		
		'RADOME_btnDefaultConf' : "Reset default Conf.",
		'RADOME_btnGetConf' : "View current Conf.",
		'RADOME_btnSaveConf' : "Save Conf.",
		
		'RADOME_Home':'Home',
		'RADOME_Debug':'Debug',
		'RADOME_Settings':'Settings',
		'RADOME_Settings2':'Settings_2',
		
		'RADOME_ToolsUsed':'This application was build using',
		'RADOME_About' :'About',
		'RADOME_BackHome' :'Back Home',	

		'RADOME_TITLE_MAPS' :'Maps demo with Gmaps',
		'RADOME_BUTTON_DELETE' :'Delete',
		'RADOME_BUTTON_SAVE' :'Save',	
		'RADOME_Footer_TEXT' :'MATIS - Software RPE | PARIS - 2014',
		
		'RADOME_ABOUT_What_Title' :'What is the "RADOME Application" ?',
		'RADOME_ABOUT_What_Desc' :'The application "RADOME Application" is a service whose goal is ....',

		'RADOME_Menu_1':'Language',
			'RADOME_SubMenu_1':'English',
			'RADOME_SubMenu_2':'French',
		'RADOME_Menu_2':'Menu',
			'RADOME_MENU_TAB_1':'Home',
			'RADOME_MENU_TAB_2':'Car',
			'RADOME_MENU_TAB_3':'Video',
			'RADOME_MENU_TAB_4':'Audio',
			'RADOME_MENU_TAB_5':'Navigation',
			'RADOME_MENU_TAB_6':'Games',
			'RADOME_MENU_TAB_7':'Settings',
			
		'RADOME_BUTTON_SEND':'Send',	
		
		'RADOME_WEBSOCKET_LOG_MAIN':'WebsocketLog MAIN',		
		'RADOME_WEBSOCKET_LOG_CAN':'WebsocketLog CAN',
		'RADOME_WEBSOCKET_LOG_VIDEO':'WebsocketLog VIDEO',
		'RADOME_WEBSOCKET_LOG_AUDIO':'WebsocketLog AUDIO',
		'RADOME_WEBSOCKET_LOG_NAV':'WebsocketLog NAV',
		
		'RADOME_SELECT_TITLE':'ServerCommands',	

		'RADOME_Start':'Start',	
		
		'RADOME_TITLE_VISU_GUI':'Visualisation Interface',	
		'RADOME_TITLE_CMD_GUI':'Command Interface',	

		'RADOME_CB_RP':'Visualisation Interface',	
		'RADOME_CB_LP':'Command Interface',	
		
		
		'RADOME_TITLE_VIDEO_STREAM':'RTMP stream using Flowplayer',
		'RADOME_TITLE_DATA1' : 'GUI for DATA°1',
		'RADOME_TITLE_DATA2' : 'GUI for DATA°2',
		'RADOME_Audio' : 'Audio Functions',
		'RADOME_Nav' : 'Navigation Functions',
			'RADOME_Nav_MapTitle' : 'Map Pointer demonstration',
			'RADOME_Nav_MapDesc' : 'Click the map pointers to learn a little more about the location.',		
			'RADOME_Nav_MapClearMarkers' : 'Clear all markers',
			'RADOME_Nav_DispMap' : 'Display MAP',		
		'RADOME_Game1' : 'RADOME_Game1',
		'RADOME_Game2' : 'RADOME_Game2',
		
		'RADOME_SELECT_AUDIO' : 'Select a title',
				
		'RADOME_BUTTON_STOP' : 'STOP ALL CAN'
    };
	//defining French strings data
	var RADOME_language_fr =
	{
		'RADOME_ClearLog': 'Effacer le log',
		
		'RADOME_Server_Info'		:	'Infos serveur',
		'RADOME_Server_release'		:	'Release',
		'RADOME_Server_buildDate'	:	'Date du build',
		'RADOME_Server_buildTime'	:	'Heure du build',	
		'RADOME_Server_LWS_vers'	:	'Vers. libwebsocket C',			
				
		'RADOME_ProjectName': 'ADAME',
		'RADOME_ProjectName_content': 'Affichage Deporte Adaptatif Multiclient pour Embarque',
		'RADOME_ChooseLang':'Choix de la langue',

		'RADOME_DEBUG_WS_URL': 'URL',
		'RADOME_DEBUG_WS_Protocol': 'Protocole',
		'RADOME_DEBUG_BUTTON_WS_CONNECT': 'Connexion',
		'RADOME_DEBUG_BUTTON_WS_DISCONNECT': 'Deconnexion',
		'RADOME_DEBUG_BUTTON_WS_debug_send': 'Envoi',
		'RADOME_DEBUG_BUTTON_WS_debug_msg': 'Message',
		
		'RADOME_Help' : "Besoin d'aide?",
		'RADOME_Help_msg' : 'taper "list" ou selectionnez le dans ServerCommands pour obtenir la liste des commandes connues par le serveur RADOME',
	
		'RADOME_btnDefaultConf' : "Restaurer la config. par defaut",
		'RADOME_btnGetConf' : "Voir la config. actuelle",
		'RADOME_btnSaveConf' : "Enregistrer la config.",

		'RADOME_Home':'Accueil',
		'RADOME_Debug':'Debug',
		'RADOME_Settings':'Parametres',
		'RADOME_Settings2':'Parametres_2',
		
		'RADOME_ToolsUsed':'Cette application est basee sur ',
		'RADOME_About' :'A propos',
		'RADOME_BackHome' :'Retour Accueil',

		'RADOME_TITLE_MAPS' :'Demonstration de carte Gmaps',
		'RADOME_BUTTON_DELETE' :'Supprimer',
		'RADOME_BUTTON_SAVE' :'Sauvegarder',
		'RADOME_Footer_TEXT' :'MATIS - EPR Logiciel | PARIS - 2014',

		'RADOME_ABOUT_What_Title' :'Qu\'est ce que le "Application RADOME" ?',
		'RADOME_ABOUT_What_Desc' :'Cette application "Application RADOME" est un service dont le but est ....',
				
		'RADOME_Menu_1':'Langue',
			'RADOME_SubMenu_1':'Anglais',
			'RADOME_SubMenu_2':'Francais',
		'RADOME_Menu_2':'Menu',
			'RADOME_MENU_TAB_1':'Accueil',
			'RADOME_MENU_TAB_2':'Vehicule',
			'RADOME_MENU_TAB_3':'Camera',
			'RADOME_MENU_TAB_4':'Audio',
			'RADOME_MENU_TAB_5':'Nav.',
			'RADOME_MENU_TAB_6':'Jeux',
			'RADOME_MENU_TAB_7':'Parametres',
			
		'RADOME_BUTTON_SEND':'Envoi',	

		'RADOME_WEBSOCKET_LOG_MAIN':'WebsocketLog MAIN',		
		'RADOME_WEBSOCKET_LOG_CAN':'WebsocketLog CAN',
		'RADOME_WEBSOCKET_LOG_VIDEO':'WebsocketLog VIDEO',
		'RADOME_WEBSOCKET_LOG_AUDIO':'WebsocketLog AUDIO',
		'RADOME_WEBSOCKET_LOG_NAV':'WebsocketLog NAV',
		
		'RADOME_SELECT_TITLE':'Commandes',	
		
		'RADOME_Start':'Demarrer',	
		
		'RADOME_TITLE_VISU_GUI':'Interface de visualisation',	
		'RADOME_TITLE_CMD_GUI':'Interface de commande',	
		
		'RADOME_CB_RP':'Interface de visualisation',	
		'RADOME_CB_LP':'Interface de commande',	

		'RADOME_TITLE_VIDEO_STREAM':'Flux RTMP ( avec Flowplayer)',
		'RADOME_TITLE_DATA1':'IHM pour Donnees°1',
		'RADOME_TITLE_DATA2':'IHM pour Donnees°2',
		'RADOME_Audio' : 'Fonctions Audio',
		'RADOME_Nav' : 'Fonctions Navigation',
			'RADOME_Nav_MapTitle' : 'Demonstration de marqueurs sur carte',
			'RADOME_Nav_MapDesc' : 'Cliquer sur le marqueur pour obtenir des informations sur le lieu.',		
			'RADOME_Nav_MapClearMarkers' : 'Supprimer les marqueurs',
			'RADOME_Nav_DispMap' : 'Afficher Carte  ',			
		'RADOME_Game1' : 'Jeu1',
		'RADOME_Game2' : 'Jeu2',
		
		'RADOME_SELECT_AUDIO' : 'Choix du titre',	
		
		'RADOME_BUTTON_STOP' : 'Arret CANs'
		
    };
    // Simply register translation table as object hash
    $translateProvider.translations('en_EN', RADOME_language_en);   
    $translateProvider.translations('fr_FR', RADOME_language_fr); 
    $translateProvider.uses(lang_default); // using English translation
}]);

RADOME_Module.controller('RADOME_MainCtrl', function ($translate, $scope, $http) {
	$scope.setLang = function (lang) {
		$translate.uses(lang);
    };
	$scope.ClientVersion = '0.2.0';
	
	$scope.MatisLogo = 'img/logos/logo_matis.png';
	$scope.AngularLogo = 'img/logos/logo_angularjs.png';
	$scope.UIBootstrapLogo = 'img/logos/logo_UIbootstrap.png';
	$scope.BSLogo = 'img/logos/logo_bootstrap.png';
	$scope.ExpressLogo= 'img/logos/logo_expressjs.png';
	$scope.MySQLLogo = 'img/logos/logo_mySQL.png';
	$scope.libwebsocketsLogo = 'img/logos/logo_libws.png';
	$scope.jqueryLogo = 'img/logos/logo_jquery.png';

	$scope.IcoMenuTab = ['img/car.png','img/video.png','img/sound.png','img/navigation.png','img/games.png','img/settings3.png','img/video.png'];
	$scope.flowplayerBG = 'img/flowplayer.png';
	
	$scope.ICO_navigation = 'img/navigation.png';
	$scope.ICO_Game1 = 'img/pad.png';
	$scope.ICO_Game2 = 'img/games.png';
	$scope.ICO_settings1= 'img/info.png';
	$scope.ICO_settings2= 'img/settings2.png';
	$scope.ICO_settings3= 'img/settings3.png';
	
	$scope.versionInfo = new Object(); 
	$scope.versionInfo.release = "release";
	$scope.versionInfo.buildDate = "buildDate";
	$scope.versionInfo.buildTime = "buildTime";
	$scope.versionInfo.LWS_version = "LWS version";
	
	$scope.demoInfo = new Object(); 
	$scope.demoInfo.labels = [];
	$scope.demoInfo.values = [];
	$scope.RADOME_DemoInfo = []; 
	$scope.RADOME_MAX_DemoInfo =7;
	
	$scope.RADOME_SentCmdHistory = []; 
	$scope.RADOME_MAX_CmdHistory =5;
	
	$scope.RADOMEAudioPath = "C:/EPR_Logiciels/RADOME/Client/media/audio/";
	
	$scope.NAV_Data = new Object(); 
	$scope.NAV_Data.lat = 0;
	$scope.NAV_Data.lng = 0;
	$scope.NAV_Data.title = "title";
	$scope.NAV_Data.infoWindow = new Object(); 
	$scope.NAV_Data.infoWindow.content = "content";

});

 // Create "Basic" controller
var BasicController = RADOME_Module.controller('BasicController', function($scope, $route, $translate) {
    var foo = $route.current.foodata;
    //alert(foo); 
});



