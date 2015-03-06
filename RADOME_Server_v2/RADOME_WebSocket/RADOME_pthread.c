//////////////////////////////////////////////////////////////////////////////////////////////
// FILENAME : RADOME_pthread.c        
//
//	DESCIPTION : threading management functions
//
// CHANGES :
//		REF NO    DATE			WHO     DETAIL
//			A0    08/07/2014	GDU     Original Code
//////////////////////////////////////////////////////////////////////////////////////////////

// INCLUDES
#include "RADOME_export.h"

// FUNCTIONS
int *do_stuff_function( void *ptr )
{
     RADOME_ThreadData_ptr p;
	 unsigned int i;

	 p = (RADOME_ThreadData_ptr)ptr;

	 for(i=0; i<(p->uiThread_NbIter); i++)
	 {
		 printf("-> %s <- | (current/total)=%d/%d\n", p->cThread_name, i,p->uiThread_NbIter);
		 Sleep((DWORD) p->dwThread_wait);
	 }
	 printf("*** 'do_stuff_function' with id={%d} and name={%s} has just finished!***\n", p->uiThread_ID, p->cThread_name);
	 return(EXIT_SUCCESS);
}

int demo_of_pthread(void)
{
	pthread_t athread[3];

	int  iret;
	RADOME_ThreadData aThreadData[3];

	//init values
	strcpy(aThreadData[0].cThread_name,"Thread 1 - TARTENPION");
	aThreadData[0].uiThread_ID = 1;
	aThreadData[0].uiThread_NbIter = 10;
	aThreadData[0].dwThread_wait = 333;
	strcpy(aThreadData[1].cThread_name,"Thread 2 - Saucisses ");
	aThreadData[1].uiThread_ID = 2;
	aThreadData[1].uiThread_NbIter = 11;
	aThreadData[1].dwThread_wait = 700;
	strcpy(aThreadData[2].cThread_name,"Thread 3 - JSON ");
	aThreadData[2].uiThread_ID = 3;
	aThreadData[2].uiThread_NbIter = 16;
	aThreadData[2].dwThread_wait = 500;
    // Create independent threads
	//each of which will execute function 

	iret = pthread_create( &athread[0], NULL, do_stuff_function, (void*) &aThreadData[0]);
     if(iret)
     {
         fprintf(stderr,"Error - pthread_create() return code: %d\n",iret);
         exit(EXIT_FAILURE);
     }
	 else
		printf("pthread_create() for athread[0] returns: %d\n",iret);

     iret = pthread_create( &athread[1], NULL, do_stuff_function, (void*) &aThreadData[1]);
     if(iret)
     {
         fprintf(stderr,"Error - pthread_create() return code: %d\n",iret);
         exit(EXIT_FAILURE);
     }
	 else
		printf("pthread_create() for athread[1] returns: %d\n",iret);

	 iret = pthread_create( &athread[2], NULL, do_stuff_function, (void*) &aThreadData[2]);
     if(iret)
     {
         fprintf(stderr,"Error - pthread_create() return code: %d\n",iret);
         exit(EXIT_FAILURE);
     }
	 else
		printf("pthread_create() for athread[2] returns: %d\n",iret);


     // Wait till threads are complete before main continues. Unless we
     // wait we run the risk of executing an exit which will terminate 
     // the process and all threads before the threads have completed. 

     pthread_join( athread[0], NULL);
     pthread_join( athread[1], NULL); 
	 pthread_join( athread[2], NULL); 
     return(EXIT_SUCCESS);
}