//////////////////////////////////////////////////////////////////////////////////////////////
// FILENAME : RADOME_export.h      
//
//	DESCIPTION : Contains the DEFINES, typedef, exported functions 
//
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////

#ifndef RADOME_EXPORT_H 
#define RADOME_EXPORT_H 

#pragma warning(disable: 4996) // disable tge following message:
//"warning C4996: 'sprintf': This function or variable may be unsafe.
//Consider using sprintf_s instead. To disable deprecation, use _CRT_SECURE_NO_WARNINGS. "
//INCLUDES
#include <time.h>
#include <stdio.h>
#include <stdlib.h>
#include "../json-c/json_tokener.h"
#include "../json-c/json_object.h"
#include "../json-c/json_util.h"
#include <windows.h>
#include  <pthread.h>
#include  <gettimeofday.h>
//DEFINES
#define RADOME_START_SERV	"Starting RADOME Websocket server...\n" 
#define RADOME_SERV_VERSION "0.4.0"
#define RADOME_LINE			"***************************************************************\n"

#define REP_SERV_HEADER		"[RADOME_SERVER] "
#define REP_SERV_DBG		"<Debug>"
#define REP_SERV_INFO		"<Info>"
#define REP_SERV_WARNING	"<Warning>"
#define REP_SERV_ERROR		"<ERROR>"

#define RADOME_LOGFILE		"RADOME.log"     // all Log(); messages will be appended to this file

#define FLOAT_LOW			0
#define FLOAT_HIGH			220

#define TRUE 1
#define FALSE 0

//#define NB_KNOWN_CMDS 18

//#define NB_THREADS 9

typedef unsigned char boolean;

// List of applications IDENTIFICATION definition
 typedef enum enumAppID {
	APP_ID_LIST = 0,
	APP_ID_VERSION ,
	APP_ID_TEST,
	APP_ID_TIME ,
	APP_ID_VIDEO,
	APP_ID_AUDIO,
	APP_ID_NAVIG,
	APP_ID_CAN_1 ,
	APP_ID_CAN_2 ,
	APP_ID_CAN_3 ,
	APP_ID_CAN_4 ,
	APP_ID_CAN_5 ,
	APP_ID_STOPCAN_1 ,
	APP_ID_STOPCAN_2 ,
	APP_ID_STOPCAN_3 ,
	APP_ID_STOPCAN_4 ,
	APP_ID_STOPCAN_5 ,
	APP_ID_DEMO,
	NB_KNOWN_CMDS
}eAppID;

// List of applications STATUS definition
  typedef enum enumStatus {
	ERRORED = -1,
    OFF = 0 ,
	RUNNING = 1,
}eStatus;

  // List of possible RETURN CODES after client received frame data
typedef enum eRADOME_ClientRet {
	CLIENT_RECEIVE_ERR=-1,
	CLIENT_RECEIVE_OK=0 ,
}eRADOME_ClientRet;

// List of threads IDENTIFICATION definition
 typedef enum enumThreadID {
	THREAD_MAIN = 0,
	THREAD_CAN_1,
	THREAD_CAN_2 ,
	THREAD_CAN_3 ,
	THREAD_CAN_4 ,
	THREAD_CAN_5 ,
	THREAD_VIDEO,
	THREAD_AUDIO,
	THREAD_NAVIG,
	THREAD_MAX
}eThreadID;

// List of possible RETURN CODES after application chosen
 typedef enum eRADOME_AppRet {
	PROCESS_GENERIC_OK,
		PROCESS_GENERIC_ERR,
	PROCESS_CAN1_OK,
		PROCESS_CAN1_ERR,
	PROCESS_CAN2_OK,
		PROCESS_CAN2_ERR,
	PROCESS_CAN3_OK,
		PROCESS_CAN3_ERR,
	PROCESS_CAN4_OK,
		PROCESS_CAN4_ERR,
	PROCESS_CAN5_OK,
		PROCESS_CAN5_ERR,
	PROCESS_AUDIO_OK,
		PROCESS_AUDIO_ERR,
	PROCESS_VIDEO_OK,
		PROCESS_VIDEO_ERR,
	PROCESS_NAV_OK,
		PROCESS_NAV_ERR,
	PROCESS_LIST_OK,
		PROCESS_LIST_ERR,
	PROCESS_VERSION_OK,
		PROCESS_VERSION_ERR,
	PROCESS_DEMO_OK,
		PROCESS_DEMO_ERR,
	NO_RUNNING_APP
 }eRADOME_AppRet;

 // Typical DATA FRAME structure & structure pointer to be sent from server
 typedef struct  { 
	eAppID AppID ; //identifiant de l'appli
	double* dData; //Donnée envoyée par l'appli
	unsigned int uiNbData; //longeur de la donnée en octet
	unsigned int uiCurrentData;
	eStatus AppStatus;//Statut de l'appli, connectée = TRUE, déconnectée = FALSE
}t_StandardDataFrame, *pt_StandardDataFrame;
 
 // demo
 typedef struct  {
	unsigned int uiThread_ID;
	unsigned int uiThread_NbIter;
	DWORD dwThread_wait;
	char cThread_name[25];
}RADOME_ThreadData, *RADOME_ThreadData_ptr;

  // Structure & structure pointer 
  // Struct past as an argument to RADOME tasks functions (multithread) for server
 /*
 typedef struct  { 
	 pthread_t thread;
	 struct libwebsocket *wsi_struct;
	 t_StandardDataFrame tDataFrame; 
}t_RADOMEThreadData, *pt_RADOMEThreadData;
*/
 // Structure & structure pointer 
 // Struct past as an argument to RADOME tasks functions (multithread) for clients
 typedef struct  { 
	 pthread_t t_threadID;
	 struct libwebsocket_context *pt_lwsctx;
	 unsigned int ui_timeout_ms;
}t_ThreadClientData, *pt_ThreadClientData;


extern TCHAR gtcWorkingDir[MAX_PATH];

// FUNCTIONS
 // functions exported from "RADOME_Functions.c"
	//extern eRADOME_AppRet RADOME_ProcessCAN (struct libwebsocket *fps_wsi, eAppID fe_AppID);
	extern eRADOME_AppRet RADOME_ProcessCAN (	struct libwebsocket *fps_wsi, 
												eAppID fe_AppID, 
												int fi_Enable,
												unsigned long ful_msTimeBetweenSendings);
	extern eRADOME_AppRet RADOME_ProcessAudio(	struct libwebsocket *fps_wsi,  
												eAppID fe_AppID);
	extern eRADOME_AppRet RADOME_ProcessVideo(	struct libwebsocket *fps_wsi,
												t_StandardDataFrame ft_DataToSend,
												unsigned long ful_msTimeBetweenSendings);
	extern eRADOME_AppRet RADOME_ProcessNAV (	struct libwebsocket *fps_wsi,
												t_StandardDataFrame ft_DataToSend,
												unsigned long ful_msTimeBetweenSendings);
	extern eRADOME_AppRet RADOME_AppSelector(	struct libwebsocket *fps_wsi, 
												eAppID fe_AppID, 
												int fb_Enable);
	extern eRADOME_AppRet RADOME_ProcessApp(	struct libwebsocket *fps_wsi, 
												eAppID fe_AppID);

	extern void RADOME_Socket_CAN1 (void *fp_ThreadData);
	extern void RADOME_Socket_CAN2 (void *fp_ThreadData);
	extern void RADOME_Socket_CAN3 (void *fp_ThreadData);
	extern void RADOME_Socket_CAN4 (void *fp_ThreadData);
	extern void RADOME_Socket_CAN5 (void *fp_ThreadData);
	extern void RADOME_Socket_VIDEO (void *fp_ThreadData);
	extern void RADOME_Socket_AUDIO (void *fp_ThreadData);
	extern void RADOME_Socket_NAV (void *fp_ThreadData);

 // functions exported from "RADOME_JSON.c"
	extern int RADOME_GetJSON_Data(	t_StandardDataFrame* fpt_InputData, 
									char*	fcp_JSON_Data, 
									unsigned int fui_idx,
									eAppID	fe_AppID );
	
 // functions exported from "RADOME_Utils.c"
	char const * RADOME_Util_EnumToText (eRADOME_AppRet eAppRet);
	int RADOME_Util_GetFilesInDir(	struct libwebsocket *fps_wsi,
										eAppID eApp_ID,
										const char * cInDirName);
	int RADOME_Util_PrintLocalTime(void);
	struct tm * RADOME_Util_GetLocalTime (void);
	void RADOME_Util_GetTimeIntoBuffer( char **pcTimeBufferToReturn);
	t_StandardDataFrame RADOME_Util_Get_Structure_Can( t_StandardDataFrame tMyDataFrame_CAN);
	void RADOME_Util_GenRandomString(	char *s, const int len);
	void RADOME_Util_Log (	int iDispOut, char *message);
	float RADOME_Util_GenRandomFloatVal(	const float fmin,const float fmax);
	int RADOME_Util_GenRandomInt(	const int fmin,const int fmax);

 //exporting some global variable for all files of procject (From RADOME_Websocket.cà
	//For LOGGING
	extern int g_bLogCreated;      // keeps track whether the log file is created or not
	extern char gc_LogLine[512];
	//For timestamp information
	extern struct tm * gpt_TimeInfo;
	extern char gc_TimeBuffer[25];
	// For Known commands on RADOME server
	extern char ga_CmdNames[NB_KNOWN_CMDS][16];
	extern const char gcAudioDirToExplore[];

	// For RADOME server Build information
	extern char *gpc_BuildDate;
	extern char *gpc_BuildTime;
	//For Applications/Services status (ex :CANx, Video, Audio, Navig...)
	extern int gb_AppStatus[NB_KNOWN_CMDS];
	/*
	extern int gbStatut_Can_1;
	extern int gb_AppStatus[fe_AppID];
	extern int gb_AppStatus[fe_AppID];
	extern int gb_AppStatus[fe_AppID];
	extern int gb_AppStatus[fe_AppID];
	extern int gbStatut_Video;
	extern int gbStatut_Audio;
	extern int gbStatut_Navig;
	*/
	// For detection of "Stop" being required
	extern int gb_StopReceived;

 // functions exported from "RADOME_JSON.c"
	void print_json_value(json_object *jobj);
	void my_JSON_read_example();
	void my_JSON_write_example();

 // functions exported from "RADOME_pthread.c"
	int demo_of_pthread(void);

// FOR DEBUG MODE ONLY
#ifdef _DEBUG
int al_debug(const char *time, const char *file, const char *func, int line, const char * format, ...);
#define RADOME_debug(...) al_debug(__TIME__, __FILE__, __FUNCTION__, __LINE__, __VA_ARGS__)
#else /* IF _DEBUG NOT DEFINED*/
#define RADOME_debug(...) /* DO NOT PRINT ANYTHING IF DEBUG IS NOT PRESENT */
#endif /* END OF _DEBUG */

#endif // END OF RADOME_EXPORT_H