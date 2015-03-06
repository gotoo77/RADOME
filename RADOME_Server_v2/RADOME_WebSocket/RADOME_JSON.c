////////////////////////////////////////////////////////////////
// FILENAME : RADOME_JSON.c        
//
//	DESCIPTION : Defines the JSON management function used
//
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    26/06/2014	GDU     Original Code
////////////////////////////////////////////////////////////////

//INCLUDES
#include "RADOME_export.h"
#include "dirent.h"


// FUNCTIONS

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :          print_json_value
// DESCRIPTION :   printing the value corresponding to boolean, double, integer and strings
//
// INPUTS :	
//
// OUTPUTS :
//       PARAMETERS:  json_object : jobj *
//				
//       RETURN : none
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    15/10/2015	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
void print_json_value(json_object *jobj)
{
  enum json_type type;
  type = json_object_get_type(jobj); //Getting the type of the json object
  printf("type: ",type);
  switch (type) 
  {
    case json_type_boolean: 
		printf("json_type_boolean");
		printf("value: %sn", json_object_get_boolean(jobj)? "true": "false");
		break;
    case json_type_double:
		printf("json_type_double");
        printf("          value: %lfn", json_object_get_double(jobj));
        break;
    case json_type_int: 
		printf("json_type_int");
        printf("          value: %dn", json_object_get_int(jobj));
        break;
    case json_type_string:
		printf("json_type_string");
        printf("          value: %sn", json_object_get_string(jobj));
		break;
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :          my_JSON_write_example
// DESCRIPTION :  sample function to demonstrate WRITE manipulations to use with "json-c" lib
//
// INPUTS :	none
//
// OUTPUTS :
//       PARAMETERS:  none
//				
//       RETURN : none
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    15/10/2015	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
void my_JSON_write_example(void)
{
	char * json_string = "/* more difficult test case */ {\"glossary\": { \"title\":\"example glossary\", \"pageCount\": 100, \"GlossDiv\": { \"title\": \"S\", \"GlossList\":[ { \"ID\": \"SGML\", \"SortAs\": \"SGML\", \"GlossTerm\": \"Standard Generalized Markup Language\", \"Acronym\": \"SGML\", \"Abbrev\": \"ISO 8879:1986\", \"GlossDef\":\"A meta-markup language, used to create markup languages such as DocBook.\",\"GlossSeeAlso\": [\"GML\", \"XML\", \"markup\"] } ] } } }";
	struct json_object *json_o1;
	struct json_object *my_object;
	int pageCount;

	const char cMyfilename[]= "Write_test.json";
	const char cMyfilename2[]= "Write_test2.json";
	char cPathToFile[MAX_PATH];
	json_object * jobj, *jstring,* jint, *jboolean,* jdouble, *jarray,*jstring1,*jstring2,* jstring3;

	json_o1 = json_tokener_parse(json_string);
	printf("json_o1 from JSON string=%s\n", json_object_to_json_string(json_o1));

	sprintf(cPathToFile,"%s/%s",(const char*)gtcWorkingDir,cMyfilename);
	// write JSON file to directory specified
	if ( json_object_to_file_ext(cPathToFile, json_o1,JSON_C_TO_STRING_PRETTY) != 0)
		printf("writing json file status : FAILED (%s)\n",cPathToFile);
	else
		printf("writing json file status : SUCCES (%s)\n",cPathToFile);

	my_object = json_object_new_object();
	json_object_object_add(my_object, "abc", json_object_new_int(12));
	json_object_object_add(my_object, "foo", json_object_new_string("bar"));
	json_object_object_add(my_object, "bool0", json_object_new_boolean(0));
	json_object_object_add(my_object, "bool1", json_object_new_boolean(1));
	json_object_object_add(my_object, "baz", json_object_new_string("bang"));
	printf("my_object created=%s\n", json_object_to_json_string(my_object));

	sprintf(cPathToFile,"%s/%s",(const char*)gtcWorkingDir,cMyfilename2);
	// write JSON file to directory specified
	if ( json_object_to_file_ext(cPathToFile, my_object,JSON_C_TO_STRING_PRETTY) != 0)
		printf("writing json file status : FAILED (%s)\n",cPathToFile);
	else
		printf("writing json file status : SUCCES (%s)\n",cPathToFile);

		json_o1 = json_object_object_get(json_o1, "glossary");
		printf("glossary=%s\n", json_object_to_json_string(json_o1));
		// retrieve value sub-section 
		json_o1 = json_object_object_get(json_o1, "pageCount");
		pageCount = json_object_get_int(json_o1);
		printf("Page count = %d\n", pageCount);

	//Creating a json object
	jobj  = json_object_new_object();
	//Creating a json string
	jstring = json_object_new_string("Joys of Programming");
	//Creating a json integer
	jint = json_object_new_int(10);
	//Creating a json boolean
	jboolean = json_object_new_boolean(1);
	//Creating a json double
	jdouble = json_object_new_double(2.14);
	//Creating a json array
	jarray = json_object_new_array();
	//Creating json strings
	jstring1 = json_object_new_string("c");
	jstring2 = json_object_new_string("c++");
	jstring3 = json_object_new_string("php");
	//Adding the above created json strings to the array
	json_object_array_add(jarray,jstring1);
	json_object_array_add(jarray,jstring2);
	json_object_array_add(jarray,jstring3);
	//Form the json object
	//Each of these is like a key value pair
	json_object_object_add(jobj,"Site Name", jstring);
	json_object_object_add(jobj,"Technical blog", jboolean);
	json_object_object_add(jobj,"Average posts per day", jdouble);
	json_object_object_add(jobj,"Number of posts", jint);
	json_object_object_add(jobj,"Categories", jarray);
	//Now printing the json object
	printf ("The json object created: %sn",json_object_to_json_string(jobj));
	//Now printing the json object
	sprintf(cPathToFile,"%s/%s",(const char*)gtcWorkingDir,"jobj.json");
	// write JSON file to directory specified
	if ( json_object_to_file_ext(cPathToFile, jobj,JSON_C_TO_STRING_PRETTY) != 0)
		printf("writing json file status : FAILED (%s)\n",cPathToFile);
	else
		printf("writing json file status : SUCCES (%s)\n",cPathToFile);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :          my_JSON_read_example
// DESCRIPTION :  sample function to demonstrate READ manipulations to use with "json-c" lib
//
// INPUTS :	
//
// OUTPUTS :
//       PARAMETERS:  none
//				
//       RETURN : none
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    15/10/2015	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
void my_JSON_read_example(void)
{
	char * json_string =NULL;
	struct json_object *my_readJSON =NULL, *jsonApp_t=NULL;
	   
	const char cMyfilename[]= "Read_test.json";
	char cPathToFile[MAX_PATH];
	
	sprintf(cPathToFile,"%s\\%s",(const char*)gtcWorkingDir,cMyfilename);
	// read from JSON file to 
	my_readJSON = json_object_from_file(cPathToFile);
	if (my_readJSON == NULL)
		printf("reading json file status : FAILED (%s)\n",cPathToFile);
	else
	{
		printf("reading json file status : SUCCES (%s)\n",cPathToFile);
		printf("Obj from JSON file=%s\n", json_object_to_json_string(my_readJSON));
	}
	// retrieve sub-section 
	jsonApp_t = json_object_object_get(my_readJSON, "app");
	printf("app=%s\n", json_object_to_json_string(jsonApp_t));
}


//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :         RADOME_GetJSON_Data
// DESCRIPTION :  function wich returns data into a JSON-style format
//
// INPUTS :	
//			t_StandardDataFrame* :	fpt_InputData :	data input used
//			char * :	fcp_JSON_Data	:	string to be filled and returned with 
//											the asked appropriate data
//			eAppID :	fe_AppID		:	ID of the app/service asked
//
// OUTPUTS :
//       PARAMETERS:  none
//				
//       RETURN : int : EXIT_SUCCESS or EXIT_FAIL
//
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    15/10/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
int RADOME_GetJSON_Data(t_StandardDataFrame* fpt_InputData, 
						char*	fcp_JSON_Data, 
						unsigned int fui_idx,
						eAppID	fe_AppID )
{
	// Declare & set variables
	const char cMyfilename[]= "fcp_JSON_Data.json";
	char cPathToFile[MAX_PATH];
	int idx=0, iGenVal=0;	json_object * jobj, *jarray, *jobj_RADOME_name,*jobj_tmp;
	char cGeneratedString[10];
	int iRet = EXIT_SUCCESS;
	char cValue_idx[4],n=0;
	DWORD dwRet;
	DIR *dir;
	struct dirent *ent;
	char bufferTime[256]="";
	float f_lat, f_lon, f_alt;
	// Retrieve current working directory
	dwRet = GetCurrentDirectory(MAX_PATH, gtcWorkingDir);

	//Create a JSON object
	jobj  = json_object_new_object();
					//Create a JSON object
				jobj_tmp  = json_object_new_object();

	//Create a JSON array
	jarray = json_object_new_array();

	//Form the JSON object according the AppID received in input parameter
	switch (fe_AppID)
	{
		case APP_ID_LIST: // will return all the Commands known by the RADOME Server
			//Create and fill the JSON object
			for (idx=0;idx<NB_KNOWN_CMDS;idx++)
			{
				jobj_RADOME_name =  json_object_new_object();
				sprintf(cValue_idx,"%d",idx+1);
				json_object_object_add(jobj_RADOME_name,"id", json_object_new_string(cValue_idx));
				json_object_object_add(jobj_RADOME_name,"name", json_object_new_string(ga_CmdNames[idx]));
				//add objet to array
				json_object_array_add(jarray,jobj_RADOME_name);
			}
			//Each of these is like a key value pair
			json_object_object_add(jobj,"AppID", json_object_new_int(fe_AppID));
			json_object_object_add(jobj,"RADOME_Cmds", jarray);
			break;

		case APP_ID_VERSION: // will return the version info for the RADOME Server
			//Create and fill the JSON object
			jobj_RADOME_name =  json_object_new_object();
			json_object_object_add(jobj_RADOME_name,"versionRelease", json_object_new_string(RADOME_SERV_VERSION));
			json_object_object_add(jobj_RADOME_name,"versionBuildDate", json_object_new_string(gpc_BuildDate));
			json_object_object_add(jobj_RADOME_name,"versionBuildTime", json_object_new_string(gpc_BuildTime));
			json_object_object_add(jobj_RADOME_name,"versionLWS", json_object_new_string(lws_get_library_version()));
			json_object_array_add(jarray,jobj_RADOME_name);

			json_object_object_add(jobj,"AppID", json_object_new_int(fe_AppID));
			json_object_object_add(jobj,"RADOME_VersionInfo", jarray);
			break;

		case APP_ID_TIME: // will return the version info for the RADOME Server
			//Create and fill the JSON object
			jobj_RADOME_name =  json_object_new_object();
			// time info structure to fill
			gpt_TimeInfo = RADOME_Util_GetLocalTime();

			//create fields of object JSON
			json_object_object_add(jobj_RADOME_name,"asctime", json_object_new_string(asctime (gpt_TimeInfo)));
			json_object_object_add(jobj_RADOME_name,"tm_sec", json_object_new_int(gpt_TimeInfo->tm_sec));
			json_object_object_add(jobj_RADOME_name,"tm_min", json_object_new_int(gpt_TimeInfo->tm_min));
			json_object_object_add(jobj_RADOME_name,"tm_hour", json_object_new_int(gpt_TimeInfo->tm_hour));
			json_object_object_add(jobj_RADOME_name,"tm_mday", json_object_new_int(gpt_TimeInfo->tm_mday));
			json_object_object_add(jobj_RADOME_name,"tm_mon", json_object_new_int(gpt_TimeInfo->tm_mon));
			json_object_object_add(jobj_RADOME_name,"tm_year", json_object_new_int(gpt_TimeInfo->tm_year));
			json_object_object_add(jobj_RADOME_name,"tm_wday", json_object_new_int(gpt_TimeInfo->tm_wday));
			json_object_object_add(jobj_RADOME_name,"tm_yday", json_object_new_int(gpt_TimeInfo->tm_yday));
			json_object_object_add(jobj_RADOME_name,"tm_isdst", json_object_new_int(gpt_TimeInfo->tm_isdst));
			// Add to 
			json_object_array_add(jarray,jobj_RADOME_name);

			json_object_object_add(jobj,"AppID", json_object_new_int(fe_AppID));
			json_object_object_add(jobj,"RADOME_TimeInfo", jarray);
			break;

		case APP_ID_TEST: // will return the Test info for the RADOME Server
			//Create and fill the JSON object
			jobj_RADOME_name =  json_object_new_object();

			//create fields of object 
			json_object_object_add(jobj_RADOME_name,"info1", json_object_new_string("info1 sample"));
			json_object_object_add(jobj_RADOME_name,"info2", json_object_new_string("info2 sample"));

			// Add to 
			json_object_array_add(jarray,jobj_RADOME_name);

			json_object_object_add(jobj,"AppID", json_object_new_int(fe_AppID));
			json_object_object_add(jobj,"RADOME_TestData", jarray);
			break;
			

		case APP_ID_DEMO: // will return all the Demo info generated by the RADOME Server
			//Create and fill the JSON object
			for (idx=0;idx<3;idx++)
			{
				jobj_RADOME_name =  json_object_new_object();
				sprintf(cValue_idx,"%d",idx+1);
				// Generate a random string and store it into buffer "cGeneratedString"
				RADOME_Util_GenRandomString(cGeneratedString,9);
				// Generate a random int between 0 and 100 and store it into var "iGenVal"
				iGenVal = RADOME_Util_GenRandomInt(0,100);
				//Each of these is like a key value pair
				json_object_object_add(jobj_RADOME_name,"label", json_object_new_string(cGeneratedString));
				json_object_object_add(jobj_RADOME_name,"value", json_object_new_int(iGenVal));
				//add objet to array
				json_object_array_add(jarray,jobj_RADOME_name);
			}
			json_object_object_add(jobj,"AppID", json_object_new_int(fe_AppID));
			json_object_object_add(jobj,"RADOME_DemoInfo", jarray);
			break;

		case APP_ID_VIDEO: // will return some Video data delivered by the RADOME Server
			//Create and fill the JSON object
			jobj_RADOME_name =  json_object_new_object();

			sprintf(bufferTime ,"%d on %d" ,fui_idx+1, fpt_InputData->uiNbData );

			json_object_object_add(jobj_RADOME_name,"source", json_object_new_string("RearCamera"));
			json_object_object_add(jobj_RADOME_name,"value", json_object_new_double(fpt_InputData->dData[fui_idx]));
			json_object_object_add(jobj_RADOME_name,"data_idx", json_object_new_string(bufferTime));

			//add objet to array
			json_object_array_add(jarray,jobj_RADOME_name);

			json_object_object_add(jobj,"AppID", json_object_new_int(fe_AppID));
			json_object_object_add(jobj,"RADOME_VIDEO_Data", jarray);
			break;

		case APP_ID_NAVIG: // will return some NAV data delivered by the RADOME Server
			//Create and fill the JSON object
			jobj_RADOME_name =  json_object_new_object();
			//sprintf(cValue_idx,"%d",idx+1);
			// Generate a random string and store it into buffer "cGeneratedString"
			RADOME_Util_GenRandomString(cGeneratedString,9);
			// Generate a random val for data simulated
			f_lat = RADOME_Util_GenRandomFloatVal(-90.0,90.0);
			f_lon = RADOME_Util_GenRandomFloatVal(-180,180);
			f_alt = RADOME_Util_GenRandomFloatVal(-10000.0,10000);
			//Each of these is like a key value pair
			//json_object_object_add(jobj_RADOME_name,"location_id", json_object_new_string(cGeneratedString));
			json_object_object_add(jobj_RADOME_name,"lat", json_object_new_double(f_lat));
			json_object_object_add(jobj_RADOME_name,"lng", json_object_new_double(f_lon));
			json_object_object_add(jobj_RADOME_name,"title", json_object_new_string(cGeneratedString));
			json_object_object_add(jobj_RADOME_name,"color", json_object_new_int(555));
			json_object_object_add(jobj_tmp,"content", json_object_new_string(cGeneratedString));
			json_object_object_add(jobj_RADOME_name,"infoWindow", jobj_tmp);
			/*
			{
			  lat: 48.880670,
			  lng: 2.188461,
			  title: 'test',
			  infoWindow: 
				{
				content: '<p>test.</p>'
			  }
			}
			*/

			//add objet to array
			json_object_array_add(jarray,jobj_RADOME_name);

			json_object_object_add(jobj,"AppID", json_object_new_int(fe_AppID));
			json_object_object_add(jobj,"RADOME_NAV_Data", jarray);
			break;

		case APP_ID_AUDIO: // will return all the Audio files retrieved by the RADOME Server
			idx=0;
			// Open directory described in gcAudioDirToExplore
			if ((dir = opendir (gcAudioDirToExplore)) != NULL) {
				while ((ent = readdir (dir)) != NULL) {
					printf ("%s\n", ent->d_name);
					//Create and fill the JSON object
					if( idx>1)
					{ // skip the 2 first elements of the 'dirent' object ("." and "..")
						jobj_RADOME_name =  json_object_new_object();
						sprintf(cValue_idx,"%d",idx+1);
						json_object_object_add(jobj_RADOME_name,"id", json_object_new_string(cValue_idx));
						json_object_object_add(jobj_RADOME_name,"name", json_object_new_string(ent->d_name));
						//add objet to array
						json_object_array_add(jarray,jobj_RADOME_name);
					}
					idx++;
				}
				// Closing previously analysed directory 
				closedir(dir);
			} 
			else { // Could not open directory 
				sprintf(gc_LogLine,"check input path of directory used : %s", gcAudioDirToExplore);
				RADOME_Util_Log(3,gc_LogLine);
			}
			//Each of these is like a key value pair
			json_object_object_add(jobj,"AppID", json_object_new_int(fe_AppID));
			json_object_object_add(jobj,"RADOME_AudioFiles", jarray);
			break;

		default:
			iRet = EXIT_FAILURE;
			break;
	}
	// Copy result into outpout 'fcp_JSON_Data'
	sprintf(fcp_JSON_Data,"%s",json_object_to_json_string(jobj) );

	// Now printing the JSON object
	printf ("The json object created: %s\n",json_object_to_json_string(jobj));
	// Copy path of working directory into "cPathToFile" buffer
	sprintf(cPathToFile,"%s/%s",(const char*)gtcWorkingDir,cMyfilename);
	// write JSON file to directory specified
	if ( json_object_to_file_ext(cPathToFile, jobj,JSON_C_TO_STRING_PRETTY) != 0)
	{
		printf("Writing JSON : FAILED (%s)\n",cPathToFile);
		iRet = EXIT_FAILURE;
	}
	else
	{
		printf("Writing JSON : SUCCES (%s)\n",cPathToFile);
		iRet = EXIT_SUCCESS;
	}

	return iRet;
}