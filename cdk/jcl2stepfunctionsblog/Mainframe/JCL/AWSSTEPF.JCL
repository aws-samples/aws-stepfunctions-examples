//AWSSTEPF JOB (COBOL),'AWSCODR',CLASS=A,MSGCLASS=A,                    00010001
//         TIME=1440,NOTIFY=&SYSUID                                     00020000
//********************************************************************* 00130000
//   SET CODER=AWSCODR                                                  00150000
//   SET SYSLBLK=3200                                                   00210000
//********************************************************************* 00220002
//*  SAMPLE JOB FOR INCLUSION IN JCL STEP FUNCTION BLOG
//* 
//*  The purpose is to demonstrate the complexity of routing flow 
//*  through steps within a mainframe batch job using JCL Condition  
//*  Code Checking and IF END IF conditions to Control Flow
//* 
//*  Below is an explanation of the "HAPPY path"
//* 
//*  In production environments, such JCLs are generally accompanied
//*  by a restart guide that give detailed instructions on 
//*  how to recover if Step 1 fails, Step 2 fails and so on.
//* 
//*  There are also tools like CA-11 that automate recovery to some
//*  extent. These require expert configuration.
//*  
//********************************************************************* 
//*  1) Step 1 (DELETEF) always runs.It deletes previous run output  
//*  2) Step 2 (EXTRDB2) run based on Cond =(0,NE)
//*     If 0 is not equal condition code of step 1 DELETEF
//*     We extract Employee data from a Db2 table using a COBOL program
//*     It may end with condition code 4 if no data is found
//*     or a higher condition code if some processing error occured
//*  3) Step 3 (EMPTYCHK) checks for COND=(4,LT)
//*     If 4 is not less than condition codes from Step 1 and Step 2
//*     Check the new employee file to see whether it is empty
//*     If it is we forcibly set the return code to 8
//*     If the file has data, we will get a return code of 0
//*  4) Step 4 (COMPAREF) is run based on JCL IF condition checking
//*     If the return code from Step 3 (EMPTYCHK) is 0
//*     Compare the keys in Db2 and employee files
//*     If the file has employees not in Db2 output to NOMATCH file
//*  5) Step 5 (EMPTYD2F) will run if the above IF condition is met
//*     It additionally has a COND=(4,LT)
//*     That is it will run if Step 3 (EMPTYCHK) return code is 0
//*      AND if 4 is not less than the return code for ANY of the steps 
//*     before the EMPTYD2F Step 
//*  6) Step 6 (SENDTOHR) is in a nested IF Condition
//*     If the condition code from step 5 EMPTYD2F is zero it will copy
//*     the file to be processed to another dataset for processing by
//*     another department
//*                                                                    
//*  There is also some commented code
//*  It is not unusual to find such confusing comments in old JCLs 
//*  These usually dont help with the  debugging
//*                                                                     00230002
//********************************************************************* 00240002
//*  Delete output from previous runs                                   00230002
//********************************************************************* 00240002
//DELETEF EXEC PGM=IEFBR14                                              00250005
//SYSPRINT DD SYSOUT=*                                                  00251002
//SYSOUT   DD SYSOUT=*                                                  00252002
//SYSDUMP  DD SYSOUT=*                                                  00253002
//DELDB2F  DD DSN=&CODER..AWS.APG.STEPDB2,                              00260002
//            DISP=(OLD,DELETE,DELETE)                                  00270002
//DELHRFL  DD DSN=&CODER..AWS.APG.STEPHRF,                              00271005
//            DISP=(OLD,DELETE,DELETE)                                  00272005
//DELMISSG DD DSN=&CODER..AWS.APG.STEPHRF,                              00273006
//            DISP=(OLD,DELETE,DELETE)                                  00290006
//********************************************************************* 01090000
//*  RUN  Db2 COBOL Batch Program to extract Permanent Employees       
//*  THIS STEP WILL RUN IF PREVIOUS STEP CONDITION CODE IS NOT EQUAL 0  01100001
//********************************************************************* 01110000
//EXTRDB2 EXEC PGM=IKJEFT01,COND=(0,NE)                                 01120007
//STEPLIB  DD  DISP=SHR,DSN=OEM.DB2.DAZ1.RUNLIB.LOAD                    01130000
//         DD  DISP=SHR,DSN=OEMA.DB2.VERSIONA.SDSNLOAD                  01140000
//SYSPRINT DD SYSOUT=*                                                  01150000
//SYSTSPRT DD SYSOUT=*                                                  01160002
//SYSOUT   DD DSN=&CODER..AWS.APG.STEPDB2,                              01161002
//            DISP=(NEW,CATLG,DELETE),                                  01162002
//            SPACE=(CYL,(1,50),RLSE),                                  01163002
//            UNIT=VIO,                                                 01164002
//            DCB=(RECFM=FB,LRECL=80,BLKSIZE=3200)                      01165002
//SYSUDUMP DD SYSOUT=*                                                  01170000
//SYSTSIN  DD *                                                         01180000
  DSN SYSTEM(DAZ1)                                                      01190000
  RUN PROGRAM(COBDB21) -                                                01200000
  PLAN(COBDB21) -                                                       01210000
  LIB('AWSCODR.AWS.LOADLIB')                                            01220000
/*                                                                      01230000
//********************************************************************* 01240004
//*  Check the second data source : New Employee file                   01250005
//*  If it has no data , no further processing is needed                01251005
//********************************************************************* 01260004
//EMPTYCHK EXEC PGM=ICETOOL,COND=(4,LT)                                 01270008
//TOOLMSG  DD SYSOUT=*                                                  01280004
//DFSMSG   DD SYSOUT=*                                                  01290004
//*Zero record file for testing flow                                    01291005
//NEWEMP   DD DISP=SHR,DSN=&CODER..AWS.APG.STEPPS0                      01300007
//*EWEMP   DD DISP=SHR,DSN=&CODER..AWS.APG.STEPPSE                      01301007
//TOOLIN DD *                                                           01310004
* set RC=8 IF 'NEWEMP file is empty'                                    01320005
  COUNT FROM(NEWEMP) EMPTY RC8                                          01340004
/*                                                                      01350004
//********************************************************************* 01360005
//*  If the new employee file has data , compare with                   01370005
//*  Db2 extract. If present,they have been added already               01371005
//*  We are interested in NOMATCH records only                          01372005
//********************************************************************* 01380005
// IF EMPTYCHK.RC = 0 THEN                                              01390005
//COMPAREF EXEC PGM=SORT                                                01391005
//SYSOUT   DD SYSOUT=*                                                  01392005
//SORTJNF1 DD DISP=SHR,DSN=&CODER..AWS.APG.STEPDB2                      01393005
//SORTJNF2 DD DISP=SHR,DSN=&CODER..AWS.APG.STEPPSE                      01394005
//DB2ONLY  DD DUMMY                                                     01395005
//*B2MISSG DD SYSOUT=*                                                  01396005
//DB2MISSG DD DSN=&CODER..AWS.APG.STEPHRF,                              01396105
//            DISP=(NEW,CATLG,DELETE),                                  01396205
//            SPACE=(CYL,(1,50),RLSE),                                  01396305
//            UNIT=VIO,                                                 01396405
//            DCB=(RECFM=FB,LRECL=80,BLKSIZE=3200)                      01396505
//DB2ADDED DD DUMMY                                                     01397005
//SYSIN    DD *                                                         01398005
* Control statements for JOINKEYS application                           01398205
 JOINKEYS FILE=F1,FIELDS=(1,45,A),SORTED,NOSEQCK                        01398305
 JOINKEYS FILE=F2,FIELDS=(1,45,A),SORTED,NOSEQCK                        01398405
 JOIN UNPAIRED,F1,F2                                                    01398505
 REFORMAT FIELDS=(F1:1,45,F2:1,45,?)                                    01398605
* Control statements for main task (joined records)                     01398705
 OPTION COPY                                                            01398805
 OUTFIL FNAMES=DB2ONLY,INCLUDE=(91,1,CH,EQ,C'1'),                       01398905
   BUILD=(1,45)                                                         01399005
 OUTFIL FNAMES=DB2MISSG,INCLUDE=(91,1,CH,EQ,C'2'),                      01399105
   BUILD=(1:46,45,80:X)                                                 01399206
 OUTFIL FNAMES=DB2ADDED,INCLUDE=(91,1,CH,EQ,C'B'),                      01399305
   BUILD=(1,45)                                                         01399406
/*                                                                      01399505
//********************************************************************* 01399605
//*  Check the Nomatch file                                             01399705
//*  If it has no data , no further processing is needed                01399805
//*  If it has data    , send to HR                                     01399905
//********************************************************************* 01400005
//EMPTYD2F EXEC PGM=ICETOOL,COND=(4,LT)                                 01400105
//TOOLMSG  DD SYSOUT=*                                                  01400205
//DFSMSG   DD SYSOUT=*                                                  01400305
//*Zero record file for testing flow                                    01400405
//NEWEMP   DD DISP=SHR,DSN=&CODER..AWS.APG.STEPHRF                      01400605
//TOOLIN DD *                                                           01400705
* Set RC=8 IF 'Db2 pending file is empty'                               01400805
  COUNT FROM(NEWEMP) EMPTY RC8                                          01400905
/*                                                                      01401005
//********************************************************************* 01401105
//*  Send Employees missing from Db2 to HR for processing               01401205
//********************************************************************* 01402005
// IF EMPTYD2F.RC = 0 THEN                                              01403005
//SENDTOHR EXEC PGM=IEBGENER                                            01404005
//SYSIN    DD DUMMY                                                     01405006
//SYSPRINT DD SYSOUT=X                                                  01406006
//SYSUT1   DD DISP=SHR,DSN=&CODER..AWS.APG.STEPHRF                      01407006
//SYSUT2   DD SYSOUT=*                                                  01408006
// ENDIF                                                                01410005
// ENDIF                                                                01420005
