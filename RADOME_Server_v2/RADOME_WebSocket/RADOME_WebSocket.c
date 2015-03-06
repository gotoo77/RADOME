//////////////////////////////////////////////////////////////////////////////////////////////
// FILENAME : RADOME_WebSocket.c        
//
//	DESCIPTION : Defines the entry point for the bash application .
//
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    19/05/2014	GDU     Original Code
//			A1	  16/06/2014	ARM		Introduction audio functionality
//			A2    26/06/2014	GDU		added RADOME_JSON.c + 'json-c' lib
//////////////////////////////////////////////////////////////////////////////////////////////


#include "../../lib/libwebsockets.h"
#include "../../lib/private-libwebsockets.h"
#include "RADOME_export.h"

#include <stdio.h>
#include <stdlib.h>
#include <getopt.h>
#include <signal.h>
#include <string.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <assert.h>
#ifdef _WIN32
#include <io.h>
#endif

static int close_testing;
int max_poll_elements;
static volatile int force_exit = 0;
// Array of contexts for each threaded WS connexion
static struct libwebsocket_context *gapt_context[THREAD_MAX];
static int deny_deflate=1;
static int deny_mux;

#define BUFFER_SIZE			200
#define MAX_NB_SERV_CMD		10
//#define LOCAL_gpc_resource_path "C:/Users/EPR_Consultant07/Desktop/nginx 1.7.1.2 Snowman_/html"
#define LOCAL_RESOURCE_PATH_RADOME  "C:/EPR_Logiciels/RADOME/Client"
#define LOCAL_RESOURCE_PATH "C:/Users/epr_consultant18.MATIS-GROUP/Desktop/libwebsockets-RADOME/CMAKEgenerated/bin/share/libwebsockets-test-server"

int gb_AppStatus[NB_KNOWN_CMDS] = { TRUE } ;

int gb_StopReceived = TRUE;

char *gpc_resource_path = LOCAL_RESOURCE_PATH;
char *gpc_resource_path_RADOME = LOCAL_RESOURCE_PATH_RADOME;

struct per_session_data__http {
	int fd; // file descriptor
	//HANDLE hFile; 
};

// Globales Variables
enum e_RADOME_protocols {
        /* always first */
        PROTOCOL_HTTP = 0,
        PROTOCOL_DUMB_INCREMENT,
        PROTOCOL_MATIS_RADOME,
		PROTOCOL_LWS_MIRROR,
        /* always last */
        RADOME_PROTOCOL_COUNT
};
 
char gc_LogLine[512];
struct tm * gpt_TimeInfo;
char gc_TimeBuffer[25];

int gi_NbHTTP_Connection = 0;
int gi_NbWS_Connection = 0;

// BUILD INFO of the app
char *gpc_BuildDate = __DATE__;  // e.g. 'Dec 15 2009'
char *gpc_BuildTime = __TIME__;  // e.g. '15:25:56'

TCHAR gtcWorkingDir[MAX_PATH];
//to get list of RADOME know commands (formatted as JSON data to be extracted in client HTML5 browser)
char ga_CmdNames[NB_KNOWN_CMDS][16]={
							"list","version","test","time",
							"VIDEO","AUDIO","NAV",
							"CAN1","CAN2","CAN3","CAN4","CAN5",
							"STOP_CAN1","STOP_CAN2","STOP_CAN3","STOP_CAN4","STOP_CAN5","demo"
						};
//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :            dump_handshake_info
// DESCRIPTION :    function that generate a info about the
//					websocket handshake : "token name | token value"
//
// INPUTS :
//			struct lws_tokens *lwst : tokens
// OUTPUTS :
//       RETURN :	static int : 'ret' error code (0 if no error)
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    25/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
static void dump_handshake_info(struct libwebsocket *fps_wsi)
{
	int n;
	static const char *token_names[] = {
		/*[WSI_TOKEN_GET_URI]		=*/ "GET URI",
		/*[WSI_TOKEN_POST_URI]		=*/ "POST URI",
		/*[WSI_TOKEN_HOST]		=*/ "Host",
		/*[WSI_TOKEN_CONNECTION]	=*/ "Connection",
		/*[WSI_TOKEN_KEY1]		=*/ "key 1",
		/*[WSI_TOKEN_KEY2]		=*/ "key 2",
		/*[WSI_TOKEN_PROTOCOL]		=*/ "Protocol",
		/*[WSI_TOKEN_UPGRADE]		=*/ "Upgrade",
		/*[WSI_TOKEN_ORIGIN]		=*/ "Origin",
		/*[WSI_TOKEN_DRAFT]		=*/ "Draft",
		/*[WSI_TOKEN_CHALLENGE]		=*/ "Challenge",

		/* new for 04 */
		/*[WSI_TOKEN_KEY]		=*/ "Key",
		/*[WSI_TOKEN_VERSION]		=*/ "Version",
		/*[WSI_TOKEN_SWORIGIN]		=*/ "Sworigin",

		/* new for 05 */
		/*[WSI_TOKEN_EXTENSIONS]	=*/ "Extensions",

		/* client receives these */
		/*[WSI_TOKEN_ACCEPT]		=*/ "Accept",
		/*[WSI_TOKEN_NONCE]		=*/ "Nonce",
		/*[WSI_TOKEN_HTTP]		=*/ "Http",

		"Accept:",
		"If-Modified-Since:",
		"Accept-Encoding:",
		"Accept-Language:",
		"Pragma:",
		"Cache-Control:",
		"Authorization:",
		"Cookie:",
		"Content-Length:",
		"Content-Type:",
		"Date:",
		"Range:",
		"Referer:",
		"Uri-Args:",

		/*[WSI_TOKEN_MUXURL]	=*/ "MuxURL",
	};
	char buf[256];

	for (n = 0; n < sizeof(token_names) / sizeof(token_names[0]); n++) {
		if (!lws_hdr_total_length(fps_wsi, (enum lws_token_indexes)n))
			continue;

		lws_hdr_copy(fps_wsi, buf, sizeof buf, (enum lws_token_indexes)n);

		sprintf(gc_LogLine,"    %s = %s\n", token_names[n], buf);
		RADOME_Util_Log(3,gc_LogLine);
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           get_mimetype
// DESCRIPTION :    function that provides the MIME type of file given in parameter
//
// INPUTS :
//			const char * : fpc_file : pointer to a string containing path of the file
// OUTPUTS :
//       RETURN :	static int : 'ret' error code (0 if no error)
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    18/07/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
const char * get_mimetype(const char * fpc_file)
{
	int n = strlen(fpc_file);

	if (n < 5)
		return NULL;

	if (!strcmp(&fpc_file[n - 4], ".ico"))
		return "image/x-icon";
	if (!strcmp(&fpc_file[n - 4], ".gif"))
		return "image/gif";
	if (!strcmp(&fpc_file[n - 4], ".jpg"))
		return "image/jpeg";
	if (!strcmp(&fpc_file[n - 4], ".png"))
		return "image/png";
	if (!strcmp(&fpc_file[n - 4], ".svg"))
		return "image/svg+xml";

	if (!strcmp(&fpc_file[n - 4], ".css"))
		return "text/css";
	if (!strcmp(&fpc_file[n - 4], ".csv"))
		return "text/csv";
	if (!strcmp(&fpc_file[n - 5], ".html"))
		return "text/html";
	if (!strcmp(&fpc_file[n - 3], ".js"))
		return "text/javascript";
	if (!strcmp(&fpc_file[n - 4], ".xml"))
		return "text/xml";

	if (!strcmp(&fpc_file[n - 4], ".mp3"))
		return "audio/mpeg";
	if (!strcmp(&fpc_file[n - 4], ".wma"))
		return "audio/x-ms-wma";
	if (!strcmp(&fpc_file[n - 4], ".wav"))
		return "audio/x-wav";

	if (!strcmp(&fpc_file[n - 3], ".js"))
		return "application/javascript";
	if (!strcmp(&fpc_file[n - 4], ".ogg"))
		return "application/ogg";
	if (!strcmp(&fpc_file[n - 4], ".pdf"))
		return "application/pdf";
	if (!strcmp(&fpc_file[n - 5], ".json"))
		return "application/json";
	if (!strcmp(&fpc_file[n - 4], ".zip"))
		return "application/zip";	

	return NULL;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :			callback_http
// DESCRIPTION :	callback called for demonstration of 'classic' http protrocol 
//					[multiple protocols management by websockets]
//
// INPUTS :
//		struct libwebsocket_context * 		:fps_context
//		struct libwebsocket *				:fps_wsi
//		enum libwebsocket_callback_reasons 	:reason
//		void *								:user
//		void *								:in
//		size_t 								:len
// OUTPUTS :
//       RETURN :	static int : 'ret' error code (0 if no error)
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    25/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
static int callback_http(	struct libwebsocket_context *context,
							struct libwebsocket *fps_wsi,
							enum libwebsocket_callback_reasons reason, void *user,
							void *in, size_t len)
{
	char client_name[128];
	char client_ip[128];
	char buf[256];
	char leaf_path[1024];
	char b64[64];
	struct timeval tv;
	int n, m;
	unsigned char *p;
	char *other_headers;
	static unsigned char buffer[4096];
	struct stat stat_buf;
	struct per_session_data__http *pss =
			(struct per_session_data__http *)user;
	const char *mimetype;

	switch (reason) {
	case LWS_CALLBACK_HTTP:
		// Dumping information using websocket interface
		dump_handshake_info(fps_wsi);

		if (len < 1) {
			libwebsockets_return_http_status(context, fps_wsi,
						HTTP_STATUS_BAD_REQUEST, NULL);
			return -1;
		}

		/* this server has no concept of directories 
		if (strchr((const char *)in + 1, '/')) {
			libwebsockets_return_http_status(context, fps_wsi,
						HTTP_STATUS_FORBIDDEN, NULL);
			return -1;
		}*/

		/* if a legal POST URL, let it continue and accept data */
		if (lws_hdr_total_length(fps_wsi, WSI_TOKEN_POST_URI))
			return 0;

		/* check for the "send a big file by hand" example case */

		if (!strcmp((const char *)in, "/leaf.jpg")) {
			if (strlen(gpc_resource_path) > sizeof(leaf_path) - 10)
				return -1;
			sprintf(leaf_path, "%s/leaf.jpg", gpc_resource_path);

			/* well, let's demonstrate how to send the hard way */

			p = buffer;

#ifdef WIN32
			pss->fd = open(leaf_path, O_RDONLY | _O_BINARY);
#else
			pss->fd = open(leaf_path, O_RDONLY);
#endif

			if (pss->fd < 0)
				return -1;

			fstat(pss->fd, &stat_buf);

			/*
			 * we will send a big jpeg file, but it could be
			 * anything.  Set the Content-Type: appropriately
			 * so the browser knows what to do with it.
			 */

			p += sprintf((char *)p,
				"HTTP/1.0 200 OK\x0d\x0a"
				"Server: libwebsockets\x0d\x0a"
				"Content-Type: image/jpeg\x0d\x0a"
					"Content-Length: %u\x0d\x0a\x0d\x0a",
					(unsigned int)stat_buf.st_size);

			/*
			 * send the http headers...
			 * this won't block since it's the first payload sent
			 * on the connection since it was established
			 * (too small for partial)
			 */

			n = libwebsocket_write(fps_wsi, buffer,
				   p - buffer, LWS_WRITE_HTTP);

			if (n < 0) {
				close(pss->fd);
				return -1;
			}
			/*
			 * book us a LWS_CALLBACK_HTTP_WRITEABLE callback
			 */
			libwebsocket_callback_on_writable(context, fps_wsi);
			break;
		}

		/* if not, send a file the easy way */
		strcpy(buf, gpc_resource_path_RADOME);
		if (strcmp(in, "/")) {
			if (*((const char *)in) != '/')
				strcat(buf, "/");
			strncat(buf, in, sizeof(buf) - strlen(gpc_resource_path_RADOME));
		} else /* default file to serve */
			strcat(buf, "/index.html");
		buf[sizeof(buf) - 1] = '\0';

		/* refuse to serve files we don't understand */
		mimetype = get_mimetype(buf);
		if (!mimetype) {
			lwsl_err("Unknown mimetype for %s\n", buf);
			libwebsockets_return_http_status(context, fps_wsi,
				      HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE, NULL);
			return -1;
		}

		/* demostrates how to set a cookie on / */

		other_headers = NULL;
		if (!strcmp((const char *)in, "/") &&
			   !lws_hdr_total_length(fps_wsi, WSI_TOKEN_HTTP_COOKIE)) {
			/* this isn't very unguessable but it'll do for us */
			gettimeofday(&tv, NULL);
			sprintf(b64, "LWS_%u_%u_COOKIE",
				(unsigned int)tv.tv_sec,
				(unsigned int)tv.tv_usec);

			sprintf(leaf_path,
				"Set-Cookie: test=LWS_%u_%u_COOKIE;Max-Age=360000\x0d\x0a",
			    (unsigned int)tv.tv_sec, (unsigned int)tv.tv_usec);
			other_headers = leaf_path;
			lwsl_err(other_headers);
		}

		if (libwebsockets_serve_http_file(context, fps_wsi, buf,
						mimetype, other_headers))
			return -1; /* through completion or error, close the socket */

		/*
		 * notice that the sending of the file completes asynchronously,
		 * we'll get a LWS_CALLBACK_HTTP_FILE_COMPLETION callback when
		 * it's done
		 */

		break;

	case LWS_CALLBACK_HTTP_BODY:
		strncpy(buf, in, 20);
		buf[20] = '\0';
		if (len < 20)
			buf[len] = '\0';

		lwsl_notice("LWS_CALLBACK_HTTP_BODY: %s... len %d\n",
				(const char *)buf, (int)len);

		break;

	case LWS_CALLBACK_HTTP_BODY_COMPLETION:
		lwsl_notice("LWS_CALLBACK_HTTP_BODY_COMPLETION\n");
		/* the whole of the sent body arried, close the connection */
		libwebsockets_return_http_status(context, fps_wsi,
						HTTP_STATUS_OK, NULL);

		return -1;

	case LWS_CALLBACK_HTTP_FILE_COMPLETION:
		lwsl_info("LWS_CALLBACK_HTTP_FILE_COMPLETION seen\n");
		/* kill the connection after we sent one file */
		return -1;

	case LWS_CALLBACK_HTTP_WRITEABLE:
		//we can send more of whatever it is we were sending
		do {
			n = read(pss->fd, buffer, sizeof buffer);
			/* problem reading, close conn */
			if (n < 0)
				goto bail;
			/* sent it all, close conn */
			if (n == 0)
				goto flush_bail;
			/*
			 * because it's HTTP and not websocket, don't need to take
			 * care about pre and postamble
			 */
			m = libwebsocket_write(fps_wsi, buffer, n, LWS_WRITE_HTTP);
			if (m < 0)
				/* write failed, close conn */
				goto bail;
			if (m != n)
				/* partial write, adjust */
				lseek(pss->fd, m - n, SEEK_CUR);

			if (m) /* while still active, extend timeout */
				libwebsocket_set_timeout(fps_wsi,
					PENDING_TIMEOUT_HTTP_CONTENT, 5);

		} while (!lws_send_pipe_choked(fps_wsi));
		libwebsocket_callback_on_writable(context, fps_wsi);
		break;
flush_bail:
		/* true if still partial pending */
		if (lws_send_pipe_choked(fps_wsi)) {
			libwebsocket_callback_on_writable(context, fps_wsi);
			break;
		}

bail:
		close(pss->fd);
		return -1;

	 // callback for confirming to continue with client IP appear in
	 // protocol 0 callback since no websocket protocol has been agreed
	 // yet.  You can just ignore this if you won't filter on client IP
	 // since the default uhandled callback return is 0 meaning let the
	 // connection continue. 

	case LWS_CALLBACK_FILTER_NETWORK_CONNECTION:
		libwebsockets_get_peer_addresses(context, fps_wsi, (int)(long)in, client_name,
			     sizeof(client_name), client_ip, sizeof(client_ip));
		printf("Server received a network connection from client[name:%s ip:(%s)]\n",client_name, client_ip);
		// if we returned non-zero from here, we kill the connection 
		break;


	case LWS_CALLBACK_GET_THREAD_ID: 
		// if you will call "libwebsocket_callback_on_writable"
		// from a different thread, return the caller thread ID
		// here so lws can use this information to work out if it
		// should signal the poll() loop to exit and restart early

		//return pthread_getthreadid_np();

		break;

	default:
		break;
	}

	return 0;
}

struct per_session_data__dumb_increment {
	int number;
};

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :			callback_dumb_increment
// DESCRIPTION :	callback called for demonstration of basic incrementation of a 
//					variable 'pss->number' in order to show that on HTML element GUI
//					[multiple protocols management by websockets]
//
// INPUTS :
//		struct libwebsocket_context * 		:fps_context
//		struct libwebsocket *				:fps_wsi
//		enum libwebsocket_callback_reasons 	:reason
//		void *								:user
//		void *								:in
//		size_t 								:len
// OUTPUTS :
//       RETURN :	static int : 'ret' error code (0 if no error)
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    25/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
static int callback_dumb_increment(	struct libwebsocket_context *context,
									struct libwebsocket *fps_wsi,
									enum libwebsocket_callback_reasons reason,
									void *user, void *in, size_t len)
{
	int n, m;
	unsigned char buf[LWS_SEND_BUFFER_PRE_PADDING + 512 +
						  LWS_SEND_BUFFER_POST_PADDING];
	unsigned char *p = &buf[LWS_SEND_BUFFER_PRE_PADDING];
	struct per_session_data__dumb_increment *pss = (struct per_session_data__dumb_increment *)user;

	switch (reason) {

	case LWS_CALLBACK_ESTABLISHED:
		lwsl_info("callback_dumb_increment: LWS_CALLBACK_ESTABLISHED\n");
		pss->number = 0;
		break;

	case LWS_CALLBACK_SERVER_WRITEABLE:
		n = sprintf((char *)p, "%d", pss->number++);
		m = libwebsocket_write(fps_wsi, p, n, LWS_WRITE_TEXT);
		if (m < n) {
			lwsl_err("ERROR %d writing to di socket\n", n);
			return -1;
		}
		if (close_testing && pss->number == 50) {
			lwsl_info("close tesing limit, closing\n");
			return -1;
		}
		break;

	case LWS_CALLBACK_RECEIVE:
		//		fprintf(stderr, "rx %d\n", (int)len);
		if (len < 6)
			break;
		if (strcmp((const char *)in, "reset\n") == 0)
			pss->number = 0;
		break;
	/*
	 * this just demonstrates how to use the protocol filter. If you won't
	 * study and reject connections based on header content, you don't need
	 * to handle this callback
	 */

	case LWS_CALLBACK_FILTER_PROTOCOL_CONNECTION:
		dump_handshake_info(fps_wsi);
		/* you could return non-zero here and kill the connection */
		break;

	default:
		break;
	}

	return 0;
}


/* lws-mirror_protocol */

#define MAX_MESSAGE_QUEUE 32

struct per_session_data__lws_mirror {
	struct libwebsocket *fps_wsi;
	int ringbuffer_tail;
};

struct a_message {
	void *payload;
	size_t len;
};

static struct a_message ringbuffer[MAX_MESSAGE_QUEUE];
static int ringbuffer_head;

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :			callback_lws_mirror
// DESCRIPTION :	callback called for demonstration of drawing in HTML canvas
//					for several users
//					[multiple protocols management by websockets]
//
// INPUTS :
//		struct libwebsocket_context * 		:fps_context
//		struct libwebsocket *				:fps_wsi
//		enum libwebsocket_callback_reasons 	:reason
//		void *								:user
//		void *								:in
//		size_t 								:len
// OUTPUTS :
//       RETURN :	static int : 'ret' error code (0 if no error)
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    25/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
static int callback_lws_mirror(struct libwebsocket_context *context,
								struct libwebsocket *fps_wsi,
								enum libwebsocket_callback_reasons reason,
								void *user, void *in, size_t len)
{
	int n;
	struct per_session_data__lws_mirror *pss = (struct per_session_data__lws_mirror *)user;

	switch (reason) {

	case LWS_CALLBACK_ESTABLISHED:
		lwsl_info("callback_lws_mirror: LWS_CALLBACK_ESTABLISHED\n");
		pss->ringbuffer_tail = ringbuffer_head;
		pss->fps_wsi = fps_wsi;
		break;

	case LWS_CALLBACK_PROTOCOL_DESTROY:
		lwsl_notice("mirror protocol cleaning up\n");
		for (n = 0; n < sizeof ringbuffer / sizeof ringbuffer[0]; n++)
			if (ringbuffer[n].payload)
				free(ringbuffer[n].payload);
		break;

	case LWS_CALLBACK_SERVER_WRITEABLE:
		if (close_testing)
			break;
		while (pss->ringbuffer_tail != ringbuffer_head) {

			n = libwebsocket_write(fps_wsi, (unsigned char *)
				   ringbuffer[pss->ringbuffer_tail].payload +
				   LWS_SEND_BUFFER_PRE_PADDING,
				   ringbuffer[pss->ringbuffer_tail].len,
								LWS_WRITE_TEXT);
			if (n < 0) {
				lwsl_err("ERROR %d writing to mirror socket\n", n);
				return -1;
			}
			if (n < ringbuffer[pss->ringbuffer_tail].len)
				lwsl_err("mirror partial write %d vs %d\n",
				       n, ringbuffer[pss->ringbuffer_tail].len);

			if (pss->ringbuffer_tail == (MAX_MESSAGE_QUEUE - 1))
				pss->ringbuffer_tail = 0;
			else
				pss->ringbuffer_tail++;

			if (((ringbuffer_head - pss->ringbuffer_tail) &
				  (MAX_MESSAGE_QUEUE - 1)) == (MAX_MESSAGE_QUEUE - 15))
				libwebsocket_rx_flow_allow_all_protocol(
					       libwebsockets_get_protocol(fps_wsi));

			// lwsl_debug("tx fifo %d\n", (ringbuffer_head - pss->ringbuffer_tail) & (MAX_MESSAGE_QUEUE - 1));

			if (lws_send_pipe_choked(fps_wsi)) {
				libwebsocket_callback_on_writable(context, fps_wsi);
				break;
			}
			/*
			 * for tests with chrome on same machine as client and
			 * server, this is needed to stop chrome choking
			 */
#ifdef _WIN32
			Sleep(1);
#else
			usleep(1);
#endif
		}
		break;

	case LWS_CALLBACK_RECEIVE:

		if (((ringbuffer_head - pss->ringbuffer_tail) &
				  (MAX_MESSAGE_QUEUE - 1)) == (MAX_MESSAGE_QUEUE - 1)) {
			lwsl_err("dropping!\n");
			goto choke;
		}

		if (ringbuffer[ringbuffer_head].payload)
			free(ringbuffer[ringbuffer_head].payload);

		ringbuffer[ringbuffer_head].payload =
				malloc(LWS_SEND_BUFFER_PRE_PADDING + len +
						  LWS_SEND_BUFFER_POST_PADDING);
		ringbuffer[ringbuffer_head].len = len;
		memcpy((char *)ringbuffer[ringbuffer_head].payload +
					  LWS_SEND_BUFFER_PRE_PADDING, in, len);
		if (ringbuffer_head == (MAX_MESSAGE_QUEUE - 1))
			ringbuffer_head = 0;
		else
			ringbuffer_head++;

		if (((ringbuffer_head - pss->ringbuffer_tail) &
				  (MAX_MESSAGE_QUEUE - 1)) != (MAX_MESSAGE_QUEUE - 2))
			goto done;

choke:
		lwsl_debug("LWS_CALLBACK_RECEIVE: throttling %p\n", fps_wsi);
		libwebsocket_rx_flow_control(fps_wsi, 0);

//		lwsl_debug("rx fifo %d\n", (ringbuffer_head - pss->ringbuffer_tail) & (MAX_MESSAGE_QUEUE - 1));
done:
		libwebsocket_callback_on_writable_all_protocol(libwebsockets_get_protocol(fps_wsi));
		break;

	/*
	 * this just demonstrates how to use the protocol filter. If you won't
	 * study and reject connections based on header content, you don't need
	 * to handle this callback
	 */

	case LWS_CALLBACK_FILTER_PROTOCOL_CONNECTION:
		dump_handshake_info(fps_wsi);
		/* you could return non-zero here and kill the connection */
		break;

	default:
		break;
	}

	return 0;
}

// one of these is auto-created for each connection and a pointer to the
// appropriate instance is passed to the callback in the user parameter
// for the RADOME protocol for instance, we use it to individualize the count for each
// connection and view client names and ips.				   
struct per_session_data__RADOME {
        int i_number;
		char c_client_name[128];
		char c_client_ip[128];
};

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           callback_RADOME
// DESCRIPTION :    main callback used for RADOME server
//
// INPUTS :
//		struct libwebsocket_context * 		:fps_context
//		struct libwebsocket *				:fps_wsi
//		enum libwebsocket_callback_reasons 	:reason
//		void *								:user
//		void *								:in
//		size_t 								:len
// OUTPUTS :
//       RETURN :	static int : 'ret' error code (0 if no error)
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    25/05/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////
static int callback_RADOME(	struct libwebsocket_context * fps_context,
							struct libwebsocket *fps_wsi,
							enum libwebsocket_callback_reasons reason, 
							void *user,
							void *in, 
							size_t len)
{
	// Local variables for this callback function
	int n;
	int idxCmd=0;
	unsigned char ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING + 1024 + LWS_SEND_BUFFER_POST_PADDING];
	unsigned char * pucLWS_buf = &ucLWS_buf[LWS_SEND_BUFFER_PRE_PADDING];

	struct per_session_data__RADOME *pss = (struct per_session_data__RADOME *)user;
	char client_name[128];
	char client_ip[128];

	// Local variables to be used
	eRADOME_ClientRet eMyClientRet = CLIENT_RECEIVE_ERR;
	eRADOME_AppRet eMyAppRet = NO_RUNNING_APP;

	switch (reason) 
	{
	  case LWS_CALLBACK_CLIENT_CONNECTION_ERROR: // just log message that error happened on client connection
		sprintf(gc_LogLine,"callback_RADOME - LWS_CALLBACK_CLIENT_CONNECTION_ERROR\n");
		RADOME_Util_Log(3,gc_LogLine);
        break;

		case LWS_CALLBACK_ESTABLISHED: // log message that connection is established
			gi_NbWS_Connection++;
			libwebsockets_get_peer_addresses(fps_context, fps_wsi, 
				fps_wsi->sock, 
				client_name, 
				sizeof(client_name), 
				client_ip, 
				sizeof(client_ip));
			sprintf(gc_LogLine, "callback_RADOME - LWS_CALLBACK_ESTABLISHED\n"
			"Server received a Websocket connection from client:[sock:%d] [name:%s] (ip:%s) | [gi_NbWS_Connection=%d]\n\r",fps_wsi->sock,client_name, client_ip,gi_NbWS_Connection);
			RADOME_Util_Log(3,gc_LogLine);
			// copy client_ip and name to per_session data
			strcpy(pss->c_client_ip,client_ip);
			strcpy(pss->c_client_name,client_name);	
            break;
	
        case LWS_CALLBACK_SERVER_WRITEABLE: // for broadcast from server to clients
				RADOME_Util_Log(3,"callback_RADOME - LWS_CALLBACK_SERVER_WRITEABLE\n");

				gpt_TimeInfo = RADOME_Util_GetLocalTime();
				strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);

				n = sprintf((char *)pucLWS_buf, "%s %s Broadcast test command %d from %s(%s) !\n",
					REP_SERV_HEADER,REP_SERV_INFO,
					pss->i_number++,pss->c_client_name, pss->c_client_ip );
				fprintf(stderr,"[%s] %s",gc_TimeBuffer,pucLWS_buf);
                n = libwebsocket_write(fps_wsi, pucLWS_buf, n, LWS_WRITE_TEXT);


				/*
                if (close_testing && pss->i_number == 50) {
                        fprintf(stderr, "close tesing limit, closing\n");
                        libwebsocket_close_and_free_session(fps_context, fps_wsi,
                                                       LWS_CLOSE_STATUS_NORMAL);
                }*/
                break;

	    case LWS_CALLBACK_FILTER_PROTOCOL_CONNECTION:
			RADOME_Util_Log(3,"callback_RADOME - LWS_CALLBACK_FILTER_PROTOCOL_CONNECTION\n");
			dump_handshake_info(fps_wsi);
            /* you could return non-zero here and kill the connection */
            break;

	  case LWS_CALLBACK_RECEIVE: { //  server received data on websocket

			// log the 'receive' event on server
			RADOME_Util_Log(3,"callback_RADOME - LWS_CALLBACK_RECEIVE\n");

			// Check command received in the 'in' buffer is correct and can be handled by server
			//array of Commands known by server ->  " ga_CmdNames[NB_KNOWN_CMDS] "
			idxCmd = 0; //set index to 0 to parse first item of array
			while (	( strcmp ( (char *)in, ga_CmdNames[idxCmd] )!= 0 ) && (idxCmd<NB_KNOWN_CMDS) )
			{
				idxCmd++;
			}
			// if index is lower than NB_KNOWN_CMDS : cmd has been found 
			if ( idxCmd < NB_KNOWN_CMDS)
			{
				printf("found %d | %s \n", idxCmd, ga_CmdNames[idxCmd] );
				// Command received can be fully handled by this server
				gpt_TimeInfo = RADOME_Util_GetLocalTime();
				strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);

				n = sprintf((char *)pucLWS_buf, "%s %s Command '%s' is OK!\n",REP_SERV_HEADER,REP_SERV_INFO, (char *)in );
				fprintf(stderr,"[%s] %s",gc_TimeBuffer,pucLWS_buf);
                n = libwebsocket_write(fps_wsi, pucLWS_buf, n, LWS_WRITE_TEXT);

				sprintf(gc_LogLine,"%s %s Received data: %s, \n",REP_SERV_HEADER, REP_SERV_INFO, (char *) in);
				RADOME_Util_Log(3,(char*)pucLWS_buf);

				eMyAppRet = RADOME_AppSelector(fps_wsi,(eAppID)idxCmd,TRUE);
			}
			else
			{
				printf("not found %d \n", idxCmd );
				// Command received cannot be handled by our RADOME server
				n = sprintf((char *)pucLWS_buf, "%s %s Unknown command '%s'!\n",REP_SERV_HEADER, REP_SERV_WARNING, (char *)in );
				RADOME_Util_Log(3,(char*)pucLWS_buf);
                n = libwebsocket_write(fps_wsi, pucLWS_buf, n, LWS_WRITE_TEXT);
			}

			// release memory previously allocated dynamically back into the wild

            break;
        }

		case LWS_CALLBACK_CLOSED: //  websocket closing event
			gi_NbWS_Connection--;
			libwebsockets_get_peer_addresses(fps_context, fps_wsi, fps_wsi->sock, client_name, sizeof(client_name), client_ip, sizeof(client_ip));
			sprintf(gc_LogLine,"callback_RADOME - LWS_CALLBACK_CLOSED\n"
			"Received Websocket closure from: [sock:%d] [name:%s] (ip:%s) | [gi_NbWS_Connection=%d]\n\r",
			fps_wsi->sock,client_name, client_ip,gi_NbWS_Connection);
			RADOME_Util_Log(3,gc_LogLine);
			break;

		case LWS_CALLBACK_FILTER_NETWORK_CONNECTION:
			libwebsockets_get_peer_addresses(fps_context, fps_wsi, fps_wsi->sock, client_name, sizeof(client_name), client_ip, sizeof(client_ip));
			sprintf(gc_LogLine,"callback_RADOME - LWS_CALLBACK_FILTER_NETWORK_CONNECTION \n");
			RADOME_Util_Log(3,gc_LogLine);
			// if we returned non-zero from here, we kill the connection
			break;

		break;

		case LWS_CALLBACK_CLOSED_HTTP: 	
			//fprintf(stderr,"callback_RADOME - LWS_CALLBACK_CLOSED_HTTP \n");
            break;
        default:
			//fprintf(stderr,"callback_RADOME - LWS_CALLBACK default %d \n",reason);
            break;
    }
    
    return 0;
}

// list of supported protocols and callbacks
static struct libwebsocket_protocols protocols[] = {
	//first protocol must always be HTTP handler
	{
		"http-only",								// name 
		callback_http,								// callback 
		sizeof (struct per_session_data__http),		// per_session_data_size 
		0,											// max frame size / rx buffer 
	},
	{
		"dumb-increment-protocol",
		callback_dumb_increment,
		sizeof(struct per_session_data__dumb_increment),
		10,
	},
	{
        "RADOME", // protocol name - very important!
        callback_RADOME,   // callback
        sizeof(struct per_session_data__RADOME),
		128,
    },
	{
		"lws-mirror-protocol",
		callback_lws_mirror,
		sizeof(struct per_session_data__lws_mirror),
		128,
	},
	{ NULL, NULL, 0, 0 } // terminator 
};


void sighandler(int sig)
{
	force_exit = 1;
	//libwebsocket_cancel_service(context);
	libwebsocket_cancel_service(gapt_context[THREAD_MAIN]);
}

static struct option options[] = {
	{ "help",	no_argument,		NULL, 'h' },
	{ "debug",	required_argument,	NULL, 'd' },
	{ "port",	required_argument,	NULL, 'p' },
	{ "ssl",	no_argument,		NULL, 's' },
	{ "allow-non-ssl",	no_argument,		NULL, 'a' },
	{ "interface",  required_argument,	NULL, 'i' },
	{ "closetest",  no_argument,		NULL, 'c' },
	{ "libev",  no_argument,		NULL, 'e' },
	#ifndef LWS_NO_DAEMONIZE
	{ "daemonize", 	no_argument,		NULL, 'D' },
	#endif
	{ "gpc_resource_path", required_argument,		NULL, 'r' },
	{ NULL, 0, 0, 0 }
};

//////////////////////////////////////////////////////////////////////////////////////////////
// NAME :           main
// DESCRIPTION :    entry point of the program
//
// INPUTS :
//		int 		:argc
//		char **		:argv
//
// OUTPUTS :
//       RETURN :	int : return error code (0 if no error)
// NOTES :        
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    25/05/2014	GDU     Added description comments
//////////////////////////////////////////////////////////////////////////////////////////////
int main(int argc, char **argv)
{
	char cert_path[1024];
	char key_path[1024];
	int n = 0;
	int use_ssl = 0;
	int opts = 0;
	char interface_name[128] = "";
	const char *iface = NULL;
	unsigned int ms, oldms = 0;
	struct lws_context_creation_info at_info[THREAD_MAX];

	int debug_level = 7;
	struct timeval tv;

	unsigned int aui_AppPort[THREAD_MAX]= {9000,9001,9002,9003,9004,9005,9006,9007,9008};
	int ai_ret[THREAD_MAX] = {0} ;
	pthread_t at_pthread[THREAD_MAX];
	t_ThreadClientData at_ThreadClientData[THREAD_MAX];
	unsigned int ui_idx_thread=0;

	void (*pRADOME_ThreadListFunc[THREAD_MAX])(void *) = {
		NULL,
		RADOME_Socket_CAN1,
		RADOME_Socket_CAN2,
		RADOME_Socket_CAN3,
		RADOME_Socket_CAN4,
		RADOME_Socket_CAN5,
		RADOME_Socket_VIDEO,
		RADOME_Socket_AUDIO,
		RADOME_Socket_NAV,
	};

	//my_JSON_write_example(); 	//my_JSON_read_example();
	// demo for thread using lib  'pthread' (POSIX, but ported to Win32 environment)
	// demo_of_pthread();

	RADOME_Util_Log(3,RADOME_LINE);
    RADOME_Util_Log(3,RADOME_START_SERV);
	sprintf(gc_LogLine,"RADOME Server Software Version is {%s}\n",RADOME_SERV_VERSION);
	RADOME_Util_Log(3,gc_LogLine);
	RADOME_Util_Log(3,RADOME_LINE);
	sprintf(gc_LogLine,"RADOME BUILD information (Date|Time): {%s | %s}\n",gpc_BuildDate,gpc_BuildTime);
	RADOME_Util_Log(3,gc_LogLine);
	RADOME_Util_Log(3,RADOME_LINE);
	gpt_TimeInfo = RADOME_Util_GetLocalTime();
	strftime(gc_TimeBuffer, 25, "%d/%m/%Y-%H:%M:%S", gpt_TimeInfo);
	sprintf(gc_LogLine,"[%s] Starting Server... \n",gc_TimeBuffer);
	RADOME_Util_Log(3,gc_LogLine);
		//RADOME_debug("debug test.\n");
		//RADOME_debug("%s and %d\n", "debug information", 42);

	// Tell the library what debug level to emit and to send it to syslog
	lws_set_log_level(debug_level, lwsl_emit_syslog);

	// Create settings using "info" structure to configure our 'RADOME' server (MAIN thread)
	memset(&at_info[THREAD_MAIN], 0, sizeof at_info[THREAD_MAIN]);
	at_info[THREAD_MAIN].port = 9000; 
	at_info[THREAD_MAIN].iface = iface;
	at_info[THREAD_MAIN].protocols = protocols;
	//optional extensions
	#ifndef LWS_NO_EXTENSIONS
	at_info[THREAD_MAIN].extensions = libwebsocket_get_internal_extensions();
	#endif
	// No SSL use
	if (!use_ssl) {
		at_info[THREAD_MAIN].ssl_cert_filepath = NULL;
		at_info[THREAD_MAIN].ssl_private_key_filepath = NULL;
	} 
	else  // Using SSL 
	{
		if (strlen(gpc_resource_path) > sizeof(cert_path) - 32) {
			lwsl_err("resource path too long\n");
			return -1;
		}
		sprintf(cert_path, "%s/libwebsockets-test-server.pem",
								gpc_resource_path);
		if (strlen(gpc_resource_path) > sizeof(key_path) - 32) {
			lwsl_err("resource path too long\n");
			return -1;
		}
		sprintf(key_path, "%s/libwebsockets-test-server.key.pem",
								gpc_resource_path);

		at_info[THREAD_MAIN].ssl_cert_filepath = cert_path;
		at_info[THREAD_MAIN].ssl_private_key_filepath = key_path;
	}
	// "group id" & "user id" -> not used
	at_info[THREAD_MAIN].gid = -1;
	at_info[THREAD_MAIN].uid = -1;

	// Loop to retrieve possible arguments options in argc/argv
	while (n >= 0)
	{
		n = getopt_long(argc, argv, "eci:hsap:d:Dr:", options, NULL);
		if (n < 0)
			continue;
		switch (n)
		{
			case 'e':
				opts |= LWS_SERVER_OPTION_LIBEV;
				break;
			case 'd':
				debug_level = atoi(optarg);
				break;
			case 's':
				use_ssl = 1;
				break;
			case 'a':
				opts |= LWS_SERVER_OPTION_ALLOW_NON_SSL_ON_SSL_PORT;
				break;
			case 'p':
				at_info[THREAD_MAIN].port = atoi(optarg);
				break;
			case 'i':
				strncpy(interface_name, optarg, sizeof interface_name);
				interface_name[(sizeof interface_name) - 1] = '\0';
				iface = interface_name;
				break;
			case 'c':
				close_testing = 1;
				RADOME_Util_Log(3, " Close testing mode -- closes on "
						   "client after 50 dumb increments"
						   "and suppresses lws_mirror spam\n");
				break;
			case 'r':
				gpc_resource_path = optarg;
				printf("Setting resource path to \"%s\"\n", gpc_resource_path);
				break;
			case 'h':
				RADOME_Util_Log(3, "Usage: RADOME-server "
						"[--port=<p>] [--ssl] "
						"[-d <log bitfield>] "
						"[--gpc_resource_path <path>]\n");
			exit(1);
		}
	} // end while
	
	// Analyse if there are some optional arguments (argc/argv) used when exe is launched
	at_info[THREAD_MAIN].options = opts;

	//To catch a signal, a signal handler is required. ( http://www.csl.mtu.edu/cs4411.ck/www/NOTES/signal/install.html )
	signal(SIGINT, sighandler); //(Signal Interrupt) Interactive attention signal. Generally generated by the application user.
	
	// Create THREAD_MAIN context
	gapt_context[THREAD_MAIN] = libwebsocket_create_context(&at_info[THREAD_MAIN]);
	// Set & init all contexts info 'lws context' using the 'at_info' structures
	for (ui_idx_thread=THREAD_CAN_1 ; ui_idx_thread< THREAD_MAX; ui_idx_thread++ )
	{
		at_info[ui_idx_thread] = at_info[THREAD_MAIN]; // copy info from THREAD_MAIN
		at_info[ui_idx_thread].port = aui_AppPort[ui_idx_thread]; // specific port for each App/service thread
		gapt_context[ui_idx_thread] = libwebsocket_create_context(&at_info[ui_idx_thread]);
	}
	
	// Set 'at_ThreadClientData' structure with context info
	for (ui_idx_thread=THREAD_CAN_1 ; ui_idx_thread< THREAD_MAX; ui_idx_thread++ )
	{
		at_ThreadClientData[ui_idx_thread].pt_lwsctx = gapt_context[ui_idx_thread];
		// settings 50ms for timeout 
		at_ThreadClientData[ui_idx_thread].ui_timeout_ms = 50;
	}

	// Create the threads for each App/service
	for (ui_idx_thread=THREAD_CAN_1 ; ui_idx_thread< THREAD_MAX; ui_idx_thread++ )
	{
		ai_ret[ui_idx_thread] = pthread_create( 
													&at_pthread[ui_idx_thread], 
													NULL,
													pRADOME_ThreadListFunc[ui_idx_thread],
													(void*)&at_ThreadClientData[ui_idx_thread] 		);
		// Update 'thread' field of structure with 'thread id' returned by the call of 'pthread_create()'
		at_ThreadClientData[THREAD_MAX].t_threadID = at_pthread[ui_idx_thread];
		// Check if returned value is error code
		if(ai_ret[ui_idx_thread])
		{
			fprintf(stderr,"Error - pthread_create() return code: %d\n", ai_ret[ui_idx_thread] );
			exit(EXIT_FAILURE);
		}
	}

	n = 0;
	while(n >= 0 && !force_exit)
		{
		gettimeofday(&tv, NULL);
 		// This provokes the LWS_CALLBACK_SERVER_WRITEABLE for every live websocket connection using 
 		// the DUMB_INCREMENT protocol, as soon as it can take more packets (usually immediately)
		ms = (tv.tv_sec * 1000) + (tv.tv_usec / 1000);
 		if ((ms - oldms) > 50) {
 			libwebsocket_callback_on_writable_all_protocol(&protocols[PROTOCOL_DUMB_INCREMENT]);
 			oldms = ms;
		}			
		n = libwebsocket_service(gapt_context[THREAD_MAIN], 50);
	}

	// Destroy all the context used and previously created
	for (ui_idx_thread=THREAD_MAIN ; ui_idx_thread< THREAD_MAX; ui_idx_thread++ )
	{
		libwebsocket_context_destroy(gapt_context[ui_idx_thread]);
	}

	lwsl_notice("RADOME Server exited cleanly\n");

	return 0;
}


