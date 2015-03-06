//////////////////////////////////////////////////////////////////////////////////////////////
// FILENAME : RADOME_utils.c        
//
//	DESCIPTION : Defines the utility functions that may be used for
//				 the project.
//
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////

//INCLUDES
#include <stdio.h>
#include <stdlib.h>
#include "../../lib/libwebsockets.h"
#include "RADOME_export.h"
#include <time.h>
#include "dirent.h"

#include <stdarg.h>                                                     
#include <string.h>                                                     

//DEFINES

//#define __WRAP_FUNCTION__    

// GLOBAL VARIABLES 
int g_bLogCreated = FALSE;
//char gc_LogLine[512];

// FUNCTIONS

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :          RADOME_Util_GetFilesInDir
// DESCRIPTION :   function used to retrieve files located in a specific directory
// INPUTS :
//			fps_wsi			: websocket interface id
//			eApp_ID		: enum relative to the Application ID
//			cInDirName	: string containing the directory name 
// OUTPUTS :
//      				
//       RETURN :  error code or the function 
//						(EXIT_SUCCESS | EXIT_FAILURE)
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//			A1	  16/06/2014	ARM		Introduction audio functionality
//			A2	  17/06/2014	GDU		adding 'cInDirName' parameter
//////////////////////////////////////////////////////////////////////////////////////////////
int RADOME_Util_GetFilesInDir(struct libwebsocket *fps_wsi,  eAppID eApp_ID, const char * cInDirName) {
	// Declare & set variables
	DIR *dir;
	struct dirent *ent;
	unsigned char ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING + 256 + LWS_SEND_BUFFER_POST_PADDING];
	unsigned char *pucLWS_buf = &ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING];
	int err = EXIT_SUCCESS, iFileId = 1,  i = 0, len=0, n=0;
		
	if ((dir = opendir (cInDirName)) != NULL) {
		while ((ent = readdir (dir)) != NULL) {
			printf ("%s\n", ent->d_name);
			 if( i>1){ // skip the 2 first elements of the 'dirent' object ("." and "..")
				// TODO : create JSON file to populate the client HTML with DOM manipulation 
				// Format Buffer to send
				len = sprintf(
					(char *)pucLWS_buf,
					"{\"AppID\":%d,\"FileName\": \"%s\",\"FileId\":%d}",
					eApp_ID,
					ent->d_name,
					iFileId
					);
			
				iFileId++;
				n = libwebsocket_write(fps_wsi, pucLWS_buf, len, LWS_WRITE_TEXT);

				// trace on server console		
				gpt_TimeInfo = RADOME_Util_GetLocalTime();
				strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);
				sprintf(gc_LogLine,"[%s]%s %s %s\n", gc_TimeBuffer, REP_SERV_HEADER, REP_SERV_INFO, pucLWS_buf);
				RADOME_Util_Log(3,gc_LogLine);
			 }
			 i++;
		}
		//closing analysed directory 
		closedir (dir);
	} 
	else { // ->could not open directory
	  perror ("");
	  sprintf(gc_LogLine,"check input path of directory used : %s", cInDirName);
	  RADOME_Util_Log(3,gc_LogLine);
	  err = EXIT_FAILURE;
	}
	return err;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_Util_PrintLocalTime
// DESCRIPTION :   function used to display the local time
// INPUTS :
//				none
// OUTPUTS :
//       RETURN :  error code or the function 
//						(EXIT_SUCCESS | EXIT_FAILURE)
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
int RADOME_Util_PrintLocalTime ()
{
	time_t tRawtime;
	struct tm * tTimeInfo;
	char cTimeBuffer[25];

	time ( &tRawtime );
	tTimeInfo = localtime ( &tRawtime );
  
	strftime(cTimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", tTimeInfo);
	printf(cTimeBuffer);

	return 0;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_Util_GetLocalTime
// DESCRIPTION :   function used to retrieve the local time
// INPUTS :
//				none
// OUTPUTS :
//       RETURN :  struct tm * : tTimeinfo
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
struct tm * RADOME_Util_GetLocalTime ()
{
  time_t rawtime;
  struct tm * tTimeinfo;

  time ( &rawtime );
  tTimeinfo = localtime ( &rawtime );

  return tTimeinfo;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_Util_GetTimeIntoBuffer
// DESCRIPTION :   
//
// INPUTS :
//				 char **pcTimeBufferToReturn
// OUTPUTS :
//				
//       RETURN : none
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
void RADOME_Util_GetTimeIntoBuffer( char **pcTimeBufferToReturn)
{
	char cTimeBuffer[25];
	struct tm * tCurrentTimeInfo = RADOME_Util_GetLocalTime();
	strftime(cTimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", tCurrentTimeInfo);
	*pcTimeBufferToReturn = &cTimeBuffer[0];
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_Util_EnumToText
// DESCRIPTION :   converts a enum value to associated error string
//
// INPUTS :
//				eRADOME_AppRet eAppReturn
// OUTPUTS :		
//       RETURN : char const * containing the TextToReturn
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//			A1    16/06/2014	ARM     correction errors for concordance between  Enum/Text
//////////////////////////////////////////////////////////////////////////////////////////////
char const * RADOME_Util_EnumToText (eRADOME_AppRet eAppReturn)
{
	char const *cTextToReturn = NULL;
	if(eAppReturn ==PROCESS_CAN1_OK)
		cTextToReturn = "PROCESS_CAN1_OK";
	else if (eAppReturn ==PROCESS_CAN1_ERR)
		cTextToReturn = "PROCESS_CAN1_ERR";
	else if(eAppReturn ==PROCESS_CAN2_OK)
		cTextToReturn = "PROCESS_CAN2_OK";
	else if(eAppReturn ==PROCESS_CAN3_OK)
		cTextToReturn = "PROCESS_CAN3_OK";
	else if(eAppReturn ==PROCESS_CAN4_OK)
		cTextToReturn = "PROCESS_CAN_OK";
	else if(eAppReturn ==PROCESS_CAN5_OK)
		cTextToReturn = "PROCESS_CAN5_OK";
	else if (eAppReturn ==PROCESS_AUDIO_OK)
		cTextToReturn = "PROCESS_AUDIO_OK";
	else if (eAppReturn ==PROCESS_AUDIO_ERR)
		cTextToReturn = "PROCESS_AUDIO_ERR";
	else if (eAppReturn ==PROCESS_VIDEO_OK)
		cTextToReturn = "PROCESS_VIDEO_OK";
	else if (eAppReturn ==PROCESS_VIDEO_ERR)
		cTextToReturn = "PROCESS_VIDEO_ERR";
	else if (eAppReturn ==PROCESS_NAV_OK)
		cTextToReturn = "PROCESS_NAV_OK";
	else if (eAppReturn ==PROCESS_NAV_ERR)
		cTextToReturn = "PROCESS_NAV_ERR";
	else if (eAppReturn ==NO_RUNNING_APP)
		cTextToReturn = "NO_RUNNING_APP";
	else
		cTextToReturn = "NO MATCH FOR THIS RETURN CODE" ;

	return cTextToReturn;
}


//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_Util_Log
// DESCRIPTION :    function used to log information / debug into a
//					specific file
//
// INPUTS :
//			char * message : string to be logged in the file
// OUTPUTS :
//       RETURN :
//			none
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
void RADOME_Util_Log (int iDispOut, char *message)
{
    FILE *file;
	if (iDispOut==1)	{
		fprintf(stderr,"%s",message);
	}
	else if ( iDispOut==2)	{
		if (!g_bLogCreated) {
			file = fopen(RADOME_LOGFILE, "a+");
			g_bLogCreated = TRUE;
		}
		else
			file = fopen(RADOME_LOGFILE, "a+");

		if (file == NULL) {
			if (g_bLogCreated)
				g_bLogCreated = FALSE;
			return;
		}
		else
		{
			fputs(message, file);
			fclose(file);
		}

		if (file)
			fclose(file);
	}
	else if ( iDispOut==3)
	{
		fprintf(stderr,"%s",message);

		if (!g_bLogCreated) {
		file = fopen(RADOME_LOGFILE, "a+");
		g_bLogCreated = TRUE;
		}
		else
			file = fopen(RADOME_LOGFILE, "a+");

		if (file == NULL) {
			if (g_bLogCreated)
				g_bLogCreated = FALSE;
			return;
		}
		else
		{
			fputs(message, file);
			fclose(file);
		}

		if (file)
			fclose(file);
	}
}

                                                    
// FOR DEBUG MODE ONLY
#ifdef _DEBUG   

int al_debug(const char *time, const char *file, const char *func, int line, const char *format, ...)
{                                                                       
    int done=0;                                                         
    va_list arg;                                                        
    va_start(arg, format);                                              
    done = fprintf(stdout, "%s :%s:%s:%d: ", time, file, func, line);
    done += vfprintf(stdout, format, arg);                              
    va_end(arg);                                                        

    return done;                                                        
}           
#endif

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_Util_GenRandomFloatVal
// DESCRIPTION :    function which generate a random float value 
//					between range [ff_min,ff_max]
//
// INPUTS :
//			const float ff_min : min value for range 
//			const float ff_max : max value for range 
// OUTPUTS :
//       RETURN :
//			float : the randomly genereted value
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
float RADOME_Util_GenRandomFloatVal(const float ff_min,const float ff_max)
{
	float fRandomVal;
	fRandomVal = ff_min + (float) (rand()) /( (float) (RAND_MAX/(ff_max-ff_min))); 

	return fRandomVal; 
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_Util_GenRandomInt
// DESCRIPTION :    function which generate a random int value 
//					between range [fi_min,fi_max]
//
// INPUTS :
//			const int fi_min : min value for range 
//			const int fi_max : max value for range 
// OUTPUTS :
//       RETURN :
//			int : the randomly genereted value
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    09/12/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
int RADOME_Util_GenRandomInt(const int fi_min,const int fi_max)
{
	int iRandomVal;
	iRandomVal = fi_min + (int) (rand()) /( (int) (RAND_MAX/(fi_max-fi_min))); 

	return iRandomVal; 
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_Util_Get_Structure_Can
// DESCRIPTION :    function which return structure CAN filled 
//
// INPUTS :
//			t_StandardDataFrame_Can tMyDataFrame_CAN : structure of CAN 
//			
// OUTPUTS :
//       RETURN :
//			t_StandardDataFrame_Can : structure returned
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    30/07/2014	ARM     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
t_StandardDataFrame RADOME_Util_Get_Structure_Can(t_StandardDataFrame tMyDataFrame_CAN)
{
	t_StandardDataFrame tMyDataFrame_CAN_local;
	
	tMyDataFrame_CAN_local.AppID = tMyDataFrame_CAN.AppID;
	tMyDataFrame_CAN_local.AppStatus = tMyDataFrame_CAN.AppStatus;
	tMyDataFrame_CAN_local.dData = tMyDataFrame_CAN.dData;
	tMyDataFrame_CAN_local.uiCurrentData = tMyDataFrame_CAN.uiCurrentData;
	tMyDataFrame_CAN_local.uiNbData = tMyDataFrame_CAN.uiNbData;

	return tMyDataFrame_CAN_local; 
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            RADOME_Util_GenRandomString
// DESCRIPTION :    function which generates a random string of specified length 
//
// INPUTS :
//			(char *) s: string to be generated and returned 
//			(const int) len : length of the string 
//			
// OUTPUTS :
//       RETURN :
//			none
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    30/07/2014	ARM     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
void RADOME_Util_GenRandomString(char *s, const int len) 
{
	int i=0;
    static const char alphanum[] =
        "0123456789"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz";

    for (i = 0; i < len; ++i) {
        s[i] = alphanum[rand() % (sizeof(alphanum) - 1)];
    }

    s[len] = 0;
}