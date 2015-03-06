////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FILENAME : RADOME_functions.c        
//
//	DESCIPTION : Defines the functions that perform the processing, sending of data, etc.. .
//
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//			A1	  16/06/2014	ARM		Introduction audio part
//			A2	  22/07/2014	GDU		corrections for audio dir,RADOME_Util_Log use added 
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//INCLUDES
#include "../../lib/libwebsockets.h"
#include "RADOME_export.h"

// GLOBAL VARIABLES 
eAppID Id_Appli_Client;
float Data_Client;
int Lengh_Data_Client;
eStatus Appli_Statut_Client;
eStatus geAppStatus[NB_KNOWN_CMDS] = {OFF};

const char gcAudioDirToExplore[] = "C:/EPR_Logiciels/RADOME/Client/media/audio";

//int *RADOME_thr_process_can( void *ptr );
int j;
// buffer for CAN sendings simulated
unsigned char ucLWS_bufCAN1[128]= {0} ;
unsigned char ucLWS_bufCAN2[128]= {0} ;
unsigned char ucLWS_bufCAN3[128]= {0} ;
unsigned char ucLWS_bufCAN4[128]= {0} ;
unsigned char ucLWS_bufCAN5[128]= {0} ;


//double gdDataBuffer[][]

double gdDataBuffer_CAN1[] = {10.5, 20, 40, 60, 80, 100, 120, 140, 150, 160, 170, 180};
t_StandardDataFrame gtDataCAN1 = { APP_ID_CAN_1, gdDataBuffer_CAN1, sizeof(gdDataBuffer_CAN1)/sizeof(double), 0, RUNNING};

double gdDataBuffer_CAN2[] = {8.5, 52, 12.4, 69.2, 47.5};
t_StandardDataFrame gtDataCAN2 ={ APP_ID_CAN_2, gdDataBuffer_CAN2, sizeof(gdDataBuffer_CAN2)/sizeof(double), 0, RUNNING};

double gdDataBuffer_CAN3[] = {6.5, 10, 30, 50, 150, 190};
t_StandardDataFrame gtDataCAN3 ={ APP_ID_CAN_3, gdDataBuffer_CAN3, sizeof(gdDataBuffer_CAN3)/sizeof(double), 0, RUNNING};

double gdDataBuffer_CAN4[] = {5.5, 18.5, 25.5, 120, 170, 180};
t_StandardDataFrame gtDataCAN4 ={ APP_ID_CAN_4, gdDataBuffer_CAN4, sizeof(gdDataBuffer_CAN4)/sizeof(double), 0, RUNNING};

double gdDataBuffer_CAN5[] = {4.5, 15.5, 23, 66, 80, 90.5};
t_StandardDataFrame gtDataCAN5 ={ APP_ID_CAN_5, gdDataBuffer_CAN5, sizeof(gdDataBuffer_CAN5)/sizeof(double), 0, RUNNING};

//double gdDataBuffer_AUDIO[3] = { 80, 100, 22};
//t_StandardDataFrame gtDataAUDIO = {APP_ID_AUDIO, gdDataBuffer_AUDIO, 3,0, RUNNING};

double dDataBuffer_VIDEO[] = { 850, 140, 4, 57.4};
t_StandardDataFrame gtDataVIDEO = {APP_ID_VIDEO, dDataBuffer_VIDEO, sizeof(dDataBuffer_VIDEO)/sizeof(double), 1, RUNNING};

double dDataBuffer_NAV[] = {10.5, 20, 5, 1 ,1};
t_StandardDataFrame gtDataNAV = {APP_ID_NAVIG, dDataBuffer_NAV, sizeof(dDataBuffer_NAV)/sizeof(double), 1, RUNNING};

// FUNCTIONS

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_ProcessCAN
// DESCRIPTION :    Function used to management the CAN simulated
//					data sent by the RADOME server
//
// INPUTS :	
//		struct libwebsocket * :fps_wsi 
//		eId_appli_can eApp_ID_Can
//				
// OUTPUTS :
//       PARAMETERS:
//				
//       RETURN : eRADOME_AppRet
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//			A1    29/07/2014	ARM     introduction Id CAN1, CAN2, CAN3, CAN4, CAN5
//			A2    22/09/2014	ARM     introduction of multithreading notion
//			A3    14/10/20114	ARM		Added of new architecture server
//////////////////////////////////////////////////////////////////////////////////////////////
eRADOME_AppRet RADOME_ProcessCAN (struct libwebsocket *fps_wsi, 
								  eAppID fe_AppID, 
								  int fi_Enable,
								  unsigned long ful_msTimeBetweenSendings)
{
	// Declare & set variables
	int n;
	//DWORD dwSleepWaitTime = 1000; // 1 sec between 2 msg sent	
	int j=0;
	
	switch(fe_AppID)
	{
		case APP_ID_CAN_1:
		// the process is stopped if, it receive a command "STOP_CAN1" or "STOP" 
		while(gb_AppStatus[fe_AppID] && gb_StopReceived)
		{
			for (j=0; j < gtDataCAN1.uiNbData; j++) 
			 {
				//if (!fi_Enable || !gb_StopReceived) break;
				if (!gb_AppStatus[fe_AppID] || !gb_StopReceived) break;
				// Format Buffer to send
				n = sprintf((char *)&ucLWS_bufCAN1[0],
					"{\"AppID\":%d,\"DataValue\":%f,\"NbData\":%d,\"CurrentData\":%d}",
				fe_AppID,
				gtDataCAN1.dData[j],
				gtDataCAN1.uiNbData,
				j);

				n = libwebsocket_write(fps_wsi, &ucLWS_bufCAN1[0], n, LWS_WRITE_TEXT);
				gpt_TimeInfo = RADOME_Util_GetLocalTime();
				strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);		
				printf("[%s]%s %s %s\n", gc_TimeBuffer, REP_SERV_HEADER, REP_SERV_INFO, &ucLWS_bufCAN1[0]);
				// wait
				Sleep(ful_msTimeBetweenSendings);
		
			}
		}

		// test retour 
		if(j== gtDataCAN1.uiNbData)
		{
			// all data have been sent
			return PROCESS_CAN1_OK;
		}
		else
		{
			// pb : not all data have been sent 
			return PROCESS_CAN1_ERR;
		}
		break;

	case APP_ID_CAN_2:
		// the process is stopped if, it receive a command "STOP_CAN2" or "STOP"
		while(gb_AppStatus[fe_AppID] && gb_StopReceived)
		{
			for (j=0; j < gtDataCAN2.uiNbData; j++) 
			{
				if (!gb_AppStatus[fe_AppID] || !gb_StopReceived) break;
				// Format Buffer to send
				n = sprintf((char *)&ucLWS_bufCAN2[0],"{\"AppID\":%d,\"DataValue\":%f,\"NbData\":%d,\"CurrentData\":%d}",
				fe_AppID,
				gtDataCAN2.dData[j],
				gtDataCAN2.uiNbData,
				j);

				n = libwebsocket_write(fps_wsi, &ucLWS_bufCAN2[0], n, LWS_WRITE_TEXT);
				gpt_TimeInfo = RADOME_Util_GetLocalTime();
				strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);
				printf("[%s]%s %s %s\n", gc_TimeBuffer, REP_SERV_HEADER, REP_SERV_INFO, &ucLWS_bufCAN2[0]);
				// wait
				Sleep(ful_msTimeBetweenSendings);
			}
		}

		// test retour 
		if(j== gtDataCAN2.uiNbData)
		{
			// all data have been sent
			return PROCESS_CAN2_OK;
		}
		else
		{
			// pb : not all data have been sent 
			return PROCESS_CAN2_ERR;
		}
		break;

	case APP_ID_CAN_3:
		// the process is stopped if, it receive a command "STOP_CAN3" or "STOP"		
		while(gb_AppStatus[fe_AppID] && gb_StopReceived )
		{
			 for (j=0; j < gtDataCAN3.uiNbData; j++) 
			  {
				if (!gb_AppStatus[fe_AppID] || !gb_StopReceived) break;
				// Format Buffer to send
				n = sprintf((char *)&ucLWS_bufCAN3[0],"{\"AppID\":%d,\"DataValue\":%f,\"NbData\":%d,\"CurrentData\":%d}",
				fe_AppID,
				gtDataCAN3.dData[j],
				gtDataCAN3.uiNbData,
				j);

				n = libwebsocket_write(fps_wsi,&ucLWS_bufCAN3[0], n, LWS_WRITE_TEXT);
				gpt_TimeInfo = RADOME_Util_GetLocalTime();
				strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);
				printf("[%s]%s %s %s\n", gc_TimeBuffer, REP_SERV_HEADER, REP_SERV_INFO, &ucLWS_bufCAN3[0]);
				// wait
				Sleep(ful_msTimeBetweenSendings);
		
			  }
		}
		
		// test retour 
		if(j== gtDataCAN3.uiNbData)
		{
			// all data have been sent
			return PROCESS_CAN3_OK;
		}
		else
		{
			// pb : not all data have been sent 
			return PROCESS_CAN3_ERR;
		}
		break;

	case APP_ID_CAN_4:
		// the process is stopped if, it receive a command "STOP_CAN4" or "STOP"
		while(gb_AppStatus[fe_AppID] && gb_StopReceived)
		{
			for (j=0; j < gtDataCAN4.uiNbData; j++) 
			{
			if (!gb_AppStatus[fe_AppID] || !gb_StopReceived) break;
			// Format Buffer to send
			n = sprintf((char *)&ucLWS_bufCAN4[0],"{\"AppID\":%d,\"DataValue\":%f,\"NbData\":%d,\"CurrentData\":%d}",
			fe_AppID, 
			gtDataCAN4.dData[j],
			gtDataCAN4.uiNbData,
			j);

			n = libwebsocket_write(fps_wsi, &ucLWS_bufCAN4[0], n, LWS_WRITE_TEXT);
			gpt_TimeInfo = RADOME_Util_GetLocalTime();
			strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);		
			printf("[%s]%s %s %s\n", gc_TimeBuffer, REP_SERV_HEADER, REP_SERV_INFO, &ucLWS_bufCAN4[0]);
			// wait
			Sleep(ful_msTimeBetweenSendings);
			}
		}				

		// test retour 
		if(j== gtDataCAN4.uiNbData)
		{
			// all data have been sent
			return PROCESS_CAN4_OK;
		}
		else
		{
			// pb : not all data have been sent 
			return PROCESS_CAN4_ERR;
		}
		break;

	case APP_ID_CAN_5:
		// the process is stopped if, it receive a command "STOP_CAN5" or "STOP"
		while(gb_AppStatus[fe_AppID] && gb_StopReceived)
		{
			for (j=0; j < gtDataCAN5.uiNbData; j++) 
			{
				if (!gb_AppStatus[fe_AppID] || !gb_StopReceived) break;
				// Format Buffer to send
				n = sprintf((char *)&ucLWS_bufCAN5[0],
					"{\"AppID\":%d,\"DataValue\":%f,\"NbData\":%d,\"CurrentData\":%d}",
					fe_AppID,
					gtDataCAN5.dData[j],
					gtDataCAN5.uiNbData,
					j);

				n = libwebsocket_write(fps_wsi, &ucLWS_bufCAN5[0], n, LWS_WRITE_TEXT);
				gpt_TimeInfo = RADOME_Util_GetLocalTime();
				strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);
				printf("[%s]%s %s %s\n", gc_TimeBuffer, REP_SERV_HEADER, REP_SERV_INFO, &ucLWS_bufCAN5[0]);
				// wait
				Sleep(ful_msTimeBetweenSendings);
			}
		}	

		// test retour 
		if(j== gtDataCAN5.uiNbData)
		{
			// all data have been sent
			return PROCESS_CAN5_OK;
		}
		else
		{
			// pb : not all data have been sent 
			return PROCESS_CAN5_ERR;
		}
		break;

	 default:
		printf("CAN ID is unknown");
		return NO_RUNNING_APP;
		break;
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           RADOME_ProcessAudio
// DESCRIPTION :    Function used to management the 'audio' 
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		struct libwebsocket * :fps_wsi 
//		eAppID : eApp_ID
//				
// OUTPUTS :
//       PARAMETERS:
//				
//       RETURN : eRADOME_AppRet
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//			A1	  16/06/2014	ARM		Introduction audio functionality
//			A2    22/09/2014	ARM     creation of the thread 7 for audio task
//*******************************************************************
eRADOME_AppRet RADOME_ProcessAudio(struct libwebsocket * fps_wsi,  
								   eAppID eApp_ID)
{
	// Declare & set variables
	// DWORD dwSleepWaitTime = 1000; // 1 sec between 2 msg sent
	eRADOME_AppRet eMyAppRet = NO_RUNNING_APP;
	int iErr = 0;
	 
	// Loop to send all data frames required by this function
	iErr = RADOME_Util_GetFilesInDir(fps_wsi, eApp_ID, gcAudioDirToExplore);
	  
	if (iErr)
		eMyAppRet = PROCESS_AUDIO_OK;
	else 
		eMyAppRet = PROCESS_AUDIO_ERR;

	return eMyAppRet;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_ProcessVideo
// DESCRIPTION :    Function used to management the 'video' 
//					functionnality&data delivered by RADOME server
//
// INPUTS :	
//		struct libwebsocket * : fps_wsi 
//		t_StandardDataFrame : ft_DataToSend
//		unsigned long : ful_msTimeBetweenSendings  
//				
// OUTPUTS :
//       PARAMETERS:
//				
//       RETURN : eRADOME_AppRet
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
eRADOME_AppRet RADOME_ProcessVideo(		struct libwebsocket *fps_wsi, 
										t_StandardDataFrame ft_DataToSend,
										unsigned long ful_msTimeBetweenSendings)
{
	// Declare & set variables
	int n;
	int ui_idx;

	unsigned char ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING + 512 + LWS_SEND_BUFFER_POST_PADDING];
	unsigned char *pucLWS_buf = &ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING];
	char cRADOMECmds[512];

	// Loop to send all data frames required by this function
	for (ui_idx=0; ui_idx < ft_DataToSend.uiNbData; ui_idx++)
	 {
		 if (gb_AppStatus[APP_ID_VIDEO]) break;
		/*
						// Format Buffer to send
						n = sprintf((char *)pucLWS_buf,
							"{\"AppID\":%d,\"DataValue\":%f,\"NbData\":%d,\"CurrentData\":%d}",
							ft_DataToSend.AppID, 
							ft_DataToSend.dData[i],
							ft_DataToSend.uiNbData,
							i);
		*/

		// Retrieve JSON Data concerned by "fe_AppID"
		if (RADOME_GetJSON_Data(&ft_DataToSend, (char*)(&cRADOMECmds), ui_idx , APP_ID_VIDEO) != EXIT_SUCCESS)
			return PROCESS_VIDEO_ERR;
		// Format Buffer to send
		n = sprintf((char *)pucLWS_buf,cRADOMECmds);

		// TO DO : change prototype of function to add fps_context struct
		/*	if (fe_AppID==APP_ID_TEST)
			libwebsocket_callback_on_writable_all_protocol(&fps_context->protocols[PROTOCOL_MATIS_RADOME]);
			else
		*/
		n = libwebsocket_write(fps_wsi, pucLWS_buf, n, LWS_WRITE_TEXT);

		// trace on server console (with timestamp)
		gpt_TimeInfo = RADOME_Util_GetLocalTime();
		strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);
		// record timestamp in buffer to be printed
		sprintf(gc_LogLine,"[%s]%s %s %s\n", gc_TimeBuffer, REP_SERV_HEADER, REP_SERV_INFO, pucLWS_buf);
		RADOME_Util_Log(3,gc_LogLine);
		// wait "ul_msTimeBetweenSendings" ms before sending next dataframe
		Sleep(ful_msTimeBetweenSendings);
	 }

	return PROCESS_VIDEO_OK;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_ProcessNAV
// DESCRIPTION :    Function used to management the 'navigation' 
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		struct libwebsocket * :fps_wsi 
//		t_StandardDataFrame : ft_DataToSend
//				
// OUTPUTS :
//       PARAMETERS:
//				
//       RETURN : eRADOME_AppRet
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
eRADOME_AppRet RADOME_ProcessNAV(struct libwebsocket *fps_wsi,
								 t_StandardDataFrame ft_DataToSend,
								 unsigned long ful_msTimeBetweenSendings)
{
	// Declare & set variables
	int ui_idx,n;
	unsigned char ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING + 256 + LWS_SEND_BUFFER_POST_PADDING];
	unsigned char *pucLWS_buf = &ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING];
	char cRADOMECmds[512];
 	
	//unsigned int ui_nbElem = sizeof(ft_DataToSend.dData)/sizeof(ft_DataToSend.dData[0]);
	// Loop to send all data frames required by this function
	 for (ui_idx=0; ui_idx < ft_DataToSend.uiNbData; ui_idx++) {
		
		 if(gb_AppStatus[APP_ID_NAVIG]) break;
		// Format Buffer to send
		/*n = sprintf((char *)pucLWS_buf,"{\"AppID\":%d,\"DataValue\":%f,\"NbData\":%d,\"CurrentData\":%d}",
			ft_DataToSend.AppID, 
			ft_DataToSend.dData[i],
			ft_DataToSend.uiNbData,
			i);
*/
		 // Retrieve JSON Data concerned by "fe_AppID"
		if (RADOME_GetJSON_Data(&ft_DataToSend, (char*)(&cRADOMECmds), ui_idx , APP_ID_NAVIG) != EXIT_SUCCESS)
			return PROCESS_NAV_ERR;
		// Format Buffer to send
		n = sprintf((char *)pucLWS_buf,cRADOMECmds);

		// TO DO : change prototype of function to add fps_context struct
		/*	if (fe_AppID==APP_ID_TEST)
			libwebsocket_callback_on_writable_all_protocol(&fps_context->protocols[PROTOCOL_MATIS_RADOME]);
			else
		*/

		n = libwebsocket_write(fps_wsi, pucLWS_buf, n, LWS_WRITE_TEXT);
		// trace on server console (with timestamp)
		gpt_TimeInfo = RADOME_Util_GetLocalTime();
		strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);
		// record timestamp in buffer to be printed
		sprintf(gc_LogLine,"[%s]%s %s %s\n", gc_TimeBuffer, REP_SERV_HEADER, REP_SERV_INFO, pucLWS_buf);
		RADOME_Util_Log(3,gc_LogLine);
		// wait
		Sleep(ful_msTimeBetweenSendings);
	 }

	// liberation memoire allouee dynamiquement + pointeur à null
	//free(cLocalBuffer); cLocalBuffer=NULL;
	// test retour 
	if(ui_idx == ft_DataToSend.uiNbData)
	{
		// all data have been sent
		return PROCESS_NAV_OK;
	}
	else
	{
		// pb : not all data have been sent 
		return PROCESS_NAV_ERR;
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :			RADOME_ProcessApp
// DESCRIPTION :    Function used to manage the processings to be done according App chosen
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		struct libwebsocket * :fps_wsi 
//				
// OUTPUTS :
//       PARAMETERS:
//				struct libwebsocket *fps_wsi	
//       RETURN : 
//				eRADOME_AppRet
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
eRADOME_AppRet RADOME_ProcessApp(struct libwebsocket * fps_wsi,
								 eAppID fe_AppID)
{
	// Declare & set variables
	int n,ui_idx=0;
	unsigned char ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING + 1024 + LWS_SEND_BUFFER_POST_PADDING];
	unsigned char *pucLWS_buf = &ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING];
	char cRADOMECmds[1024];

	// Retrieve JSON Data concerned by fe_AppID
	if (RADOME_GetJSON_Data(NULL, (char*)(&cRADOMECmds), ui_idx , fe_AppID) != EXIT_SUCCESS)
		return PROCESS_GENERIC_ERR;
	// Format Buffer to send
	n = sprintf((char *)pucLWS_buf,cRADOMECmds);

	// TO DO : change prototype of function to add fps_context struct
	/*	if (fe_AppID==APP_ID_TEST)
		libwebsocket_callback_on_writable_all_protocol(&fps_context->protocols[PROTOCOL_MATIS_RADOME]);
		else
	*/
	n = libwebsocket_write(fps_wsi, pucLWS_buf, n, LWS_WRITE_TEXT);
	// trace on server console		
	gpt_TimeInfo = RADOME_Util_GetLocalTime();
	strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);
	// record timestamp in buffer to be printed
	sprintf(gc_LogLine,"[%s]%s %s %s\n", gc_TimeBuffer, REP_SERV_HEADER, REP_SERV_INFO, pucLWS_buf);
	RADOME_Util_Log(3,gc_LogLine);

	return PROCESS_GENERIC_OK;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :         RADOME_GetTime
// DESCRIPTION :  Delivers current time info by server  
//
// INPUTS :
//				struct libwebsocket *fps_wsi, 
//				
// OUTPUTS :
//       PARAMETERS:
//		
//       RETURN :
//				eRADOME_AppRet
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    27/01/2015	GDU     Added this description comment 

//*******************************************************************
eRADOME_AppRet RADOME_GetTime(struct libwebsocket *fps_wsi)
{
	// Declare & set variables
	int n;
	unsigned char ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING + 512 + LWS_SEND_BUFFER_POST_PADDING];
	unsigned char *pucLWS_buf = &ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING];
	//char cRADOMEVersionInfo[512];

	gpt_TimeInfo = RADOME_Util_GetLocalTime();
	n = sprintf((char *)pucLWS_buf, "%s %s Current server time:%s\n",REP_SERV_HEADER, REP_SERV_INFO, asctime (gpt_TimeInfo) );
	RADOME_Util_Log(3,(char*)pucLWS_buf);
	n = libwebsocket_write(fps_wsi, pucLWS_buf, n, LWS_WRITE_TEXT);

	return PROCESS_LIST_OK;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_AppSelector
// DESCRIPTION :   
//
// INPUTS :
//				struct libwebsocket *fps_wsi, 
//				eAppID eApp_ID, 
//				eId_appli_can eApp_ID_Can
//				
// OUTPUTS :
//       PARAMETERS:
//       RETURN :
//				eRADOME_AppRet : return code for the function
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//			A1	  16/06/2014	ARM		Introduction audio functionality
//			A2	  24/09/2014	ARM		Add severals Id Can application for ..each Id_CAN in one task thread
//*******************************************************************
eRADOME_AppRet RADOME_AppSelector(struct libwebsocket *fps_wsi,
								  eAppID fe_AppID, 
								  int fb_Enable)
{
	int i; 
	eRADOME_AppRet eRet = NO_RUNNING_APP;
	unsigned char ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING + 512 + LWS_SEND_BUFFER_POST_PADDING];
	unsigned char *pucLWS_buf = &ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING];
	
	switch(fe_AppID)
	{
		case APP_ID_LIST :
			eRet = RADOME_ProcessApp(fps_wsi, fe_AppID);
		break;

		case APP_ID_VERSION :
			eRet = RADOME_ProcessApp(fps_wsi, fe_AppID);
		break;

		case APP_ID_TEST :
			//eRet = RADOME_ProcessApp(fps_wsi, fe_AppID);
			libwebsocket_callback_on_writable_all_protocol(libwebsockets_get_protocol(fps_wsi));

			//libwebsocket_callback_on_writable_all_protocol(&fps_context->protocols[PROTOCOL_MATIS_RADOME]);
		break;
		
		case APP_ID_TIME :
			eRet = RADOME_ProcessApp(fps_wsi, fe_AppID);
			break;

		case APP_ID_VIDEO :
			// Set concerned Status of App/service to "RUNNING" State	
			geAppStatus[fe_AppID] = RUNNING;
			// Call concerned processing
			eRet = RADOME_ProcessVideo(fps_wsi, gtDataVIDEO, (unsigned long)1000);
			//eRet = RADOME_ProcessApp(fps_wsi, fe_AppID);
			// Set concerned Status of App/service to "OFF" State
			geAppStatus[fe_AppID] = OFF;

			break;

		case APP_ID_AUDIO :
			geAppStatus[fe_AppID] = RUNNING;
			eRet = RADOME_ProcessApp(fps_wsi, fe_AppID);
			geAppStatus[fe_AppID] = OFF;
			break;

		case APP_ID_NAVIG :
			geAppStatus[fe_AppID] = RUNNING;
			eRet = RADOME_ProcessNAV(fps_wsi, gtDataNAV,(unsigned long)2500);
			geAppStatus[fe_AppID] = OFF;
			break;

		case APP_ID_CAN_1 :
		case APP_ID_CAN_2 :
		case APP_ID_CAN_3 :
		case APP_ID_CAN_4 :
		case APP_ID_CAN_5 :
			geAppStatus[fe_AppID] = RUNNING;
			gb_AppStatus[fe_AppID]= !gb_AppStatus[fe_AppID];
			eRet = RADOME_ProcessCAN(fps_wsi, fe_AppID, gb_AppStatus[fe_AppID],(unsigned long)1500);
			//geAppStatus[fe_AppID] = OFF;
			break;

		case APP_ID_STOPCAN_1 :
		case APP_ID_STOPCAN_2 :
		case APP_ID_STOPCAN_3 :
		case APP_ID_STOPCAN_4 :
		case APP_ID_STOPCAN_5 :
			//geAppStatus[fe_AppID] = RUNNING;
			//eRet = RADOME_ProcessCAN(fps_wsi, fe_AppID);
			gb_AppStatus[fe_AppID-5]= FALSE;
			geAppStatus[fe_AppID] = OFF;
			break;

		case APP_ID_DEMO :
			eRet = RADOME_ProcessApp(fps_wsi, fe_AppID);
		break;		

		default:
			for (i = 0 ; i< APP_ID_DEMO; i++){
				geAppStatus[i] = OFF;
			}
			eRet = NO_RUNNING_APP;
          break;
	}

	// debug
	if (eRet != NO_RUNNING_APP)
	{
		char const *const cDebugText = RADOME_Util_EnumToText (eRet);
		sprintf(gc_LogLine,"%s | %s %s\n", REP_SERV_HEADER, REP_SERV_DBG,  cDebugText);
		RADOME_Util_Log(3,gc_LogLine);
	}
	// return error code
	return eRet;
}


//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           RADOME_Socket_CAN1
// DESCRIPTION :    Function for threading socket establishment and communication for 'CAN1' 
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		void * :fp_ThreadData : cointains the data used for thread
//				
// OUTPUTS :
//       PARAMETERS:  
//       RETURN : void
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    14/10/2014	ARM     Original Code
//*******************************************************************
void RADOME_Socket_CAN1 (void *fp_ThreadData )
{
	// Retrieve data from pointer fp_ThreadData 
	t_ThreadClientData  *t_ThreadData = (t_ThreadClientData*)fp_ThreadData;
	int n = 0;
	
	// the process is stopped if the client send stop
	while(n >= 0 && gb_StopReceived)
	{
		n = libwebsocket_service(	t_ThreadData->pt_lwsctx,
									t_ThreadData->ui_timeout_ms);
		Sleep(200);
	}
	// Exit and shut down the pthread used 
	pthread_exit(&t_ThreadData->t_threadID);
	// Destroy the libwebsocket context
	libwebsocket_context_destroy(t_ThreadData->pt_lwsctx);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           RADOME_Socket_CAN2
// DESCRIPTION :    Function for threading socket establishment and communication for 'CAN2' 
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		void * :fp_ThreadData 
//				
// OUTPUTS :
//       PARAMETERS:  
//       RETURN : void
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    14/10/2014	ARM     Original Code
//*******************************************************************
void RADOME_Socket_CAN2 (void *fp_ThreadData )
{
	t_ThreadClientData  *t_ThreadData = (t_ThreadClientData*)fp_ThreadData;
	int n = 0;
	
	// the process is stopped if the client send stop
	while(n >= 0 && gb_StopReceived)
	{
		
		n = libwebsocket_service(t_ThreadData->pt_lwsctx, t_ThreadData->ui_timeout_ms);
		Sleep(200);
	}
	// Exit and shut down the pthread used 
	pthread_exit(&t_ThreadData->t_threadID);
	// Destroy the libwebsocket context
	libwebsocket_context_destroy(t_ThreadData->pt_lwsctx);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           RADOME_Socket_CAN3
// DESCRIPTION :    Function for threading socket establishment and communication for 'CAN3' 
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		void * :fp_ThreadData 
//				
// OUTPUTS :
//       PARAMETERS:  
//       RETURN : void
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    14/10/2014	ARM     Original Code
//*******************************************************************
void RADOME_Socket_CAN3 (void *fp_ThreadData )
{
	t_ThreadClientData  *t_ThreadData = (t_ThreadClientData*)fp_ThreadData;
	int n=0;
	
	// the process is stopped if the client send stop
	while(n >= 0 && gb_StopReceived)
	{
		
		n = libwebsocket_service(t_ThreadData->pt_lwsctx, t_ThreadData->ui_timeout_ms);
		Sleep(200);
	}
	// Exit and shut down the pthread used 
	pthread_exit(&t_ThreadData->t_threadID);
	// Destroy the libwebsocket context
	libwebsocket_context_destroy(t_ThreadData->pt_lwsctx);
}
//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           RADOME_Socket_CAN4
// DESCRIPTION :    Function for threading socket establishment and communication for 'CAN4' 
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		void * :fp_ThreadData 
//				
// OUTPUTS :
//       PARAMETERS:  
//       RETURN : void
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    14/10/2014	ARM     Original Code
//*******************************************************************
void RADOME_Socket_CAN4 (void *fp_ThreadData )
{
	t_ThreadClientData  *t_ThreadData = (t_ThreadClientData*)fp_ThreadData;
	int n=0;
	
	// the process is stopped if the client send stop
	while(n >= 0 && gb_StopReceived)
	{
		n = libwebsocket_service(t_ThreadData->pt_lwsctx, t_ThreadData->ui_timeout_ms);
		Sleep(200);
	}
	// Exit and shut down the pthread used 
	pthread_exit(&t_ThreadData->t_threadID);
	// Destroy the libwebsocket context
	libwebsocket_context_destroy(t_ThreadData->pt_lwsctx);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           RADOME_Socket_CAN5
// DESCRIPTION :    Function for threading socket establishment and communication for 'CAN5' 
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		void * :fp_ThreadData 
//				
// OUTPUTS :
//       PARAMETERS:  
//       RETURN : void
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    14/10/2014	ARM     Original Code
//*******************************************************************
void RADOME_Socket_CAN5 (void *fp_ThreadData )
{
	t_ThreadClientData  *t_ThreadData = (t_ThreadClientData*)fp_ThreadData;
	int n=0;
	
	// the process is stopped if the client send stop
	while(n >= 0 && gb_StopReceived)
	{
		n = libwebsocket_service(t_ThreadData->pt_lwsctx, t_ThreadData->ui_timeout_ms);
		Sleep(200);
	}
	// Exit and shut down the pthread used 
	pthread_exit(&t_ThreadData->t_threadID);
	// Destroy the libwebsocket context
	libwebsocket_context_destroy(t_ThreadData->pt_lwsctx);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           RADOME_Socket_VIDEO
// DESCRIPTION :    Function for threading socket establishment and communication for 'VIDEO' 
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		void * :fp_ThreadData 
//				
// OUTPUTS :
//       PARAMETERS:  
//       RETURN : void
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    14/10/2014	ARM     Original Code
//*******************************************************************
void RADOME_Socket_VIDEO (void *fp_ThreadData )
{
	t_ThreadClientData  *t_ThreadData = (t_ThreadClientData*)fp_ThreadData;
	int n=0;
	
	// the process is stopped if the client send stop
	while(n >= 0 && gb_StopReceived)
	{
		n = libwebsocket_service(t_ThreadData->pt_lwsctx, t_ThreadData->ui_timeout_ms);
		Sleep(200);
	}
	// Exit and shut down the pthread used 
	pthread_exit(&t_ThreadData->t_threadID);
	// Destroy the libwebsocket context
	libwebsocket_context_destroy(t_ThreadData->pt_lwsctx);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           RADOME_Socket_AUDIO
// DESCRIPTION :    Function for threading socket establishment and communication for 'AUDIO' 
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		void * :fp_ThreadData 
//				
// OUTPUTS :
//       PARAMETERS: 
//       RETURN : void
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    14/10/2014	ARM     Original Code
//*******************************************************************
void RADOME_Socket_AUDIO (void *fp_ThreadData )
{
	t_ThreadClientData  *t_ThreadData = (t_ThreadClientData*)fp_ThreadData;
	int n=0;
	
	// the process is stopped if the client send stop
	while(n >= 0 && gb_StopReceived)
	{
		n = libwebsocket_service(t_ThreadData->pt_lwsctx, t_ThreadData->ui_timeout_ms);
		Sleep(200);
	}
	// Exit and shut down the pthread used 
	pthread_exit(&t_ThreadData->t_threadID);
	// Destroy the libwebsocket context
	libwebsocket_context_destroy(t_ThreadData->pt_lwsctx);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           RADOME_Socket_NAV
// DESCRIPTION :    Function for threading socket establishment and communication for 'NAV'
//					functionnality delivered by RADOME server
//
// INPUTS :	
//		void * :fp_ThreadData 
//				
// OUTPUTS :
//       PARAMETERS: 
//       RETURN : void
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    14/10/2014	ARM     Original Code
//*******************************************************************
void RADOME_Socket_NAV (void *fp_ThreadData )
{
	t_ThreadClientData  *t_ThreadData = (t_ThreadClientData*)fp_ThreadData;
	int n= 0;
	
	// the process is stopped if the client send stop
	while(n >= 0 && gb_StopReceived)
	{
		n = libwebsocket_service(t_ThreadData->pt_lwsctx, t_ThreadData->ui_timeout_ms);
		Sleep(200);
	}
	// Exit and shut down the pthread used 
	pthread_exit(&t_ThreadData->t_threadID);
	// Destroy the libwebsocket context
	libwebsocket_context_destroy(t_ThreadData->pt_lwsctx);
}