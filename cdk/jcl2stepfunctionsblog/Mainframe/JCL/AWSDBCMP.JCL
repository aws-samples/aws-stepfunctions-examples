//AWSDBCMP JOB (COBOL),'AWSCODR',CLASS=A,MSGCLASS=A,                    00010000
//         TIME=1440,NOTIFY=&SYSUID                                     00020000
//********************************************************************* 00030000
//****  THIS IS A JCL TO COMPILE THE Db2 COBOL PROGRAM CALLED BY ****** 
//****  THE JCL TO STEP FUNCTIONS DEMO JCL.                      ****** 
//****  YOUR SHOP FLOOR WILL FOLLOW A DIFFERENT PROCESS          ******  
//****  FOR COMPILATION. PLEASE CHECK WITH YOUR ADMINISTRATOR    ******
//********************************************************************* 00100000
//*  SET PARMS FOR THIS COMPILE:                                        00110000
//*  Do a replace all changing COBDB21 to your prog name !!!            00120000
//********************************************************************* 00130000
//   SET MEMNAME=COBDB21                                                00140000
//   SET CODER=AWSCODR                                                  00150000
//   SET SRCLIB=&CODER..AWS.CBL                                         00160000
//   SET COPYLIB=&CODER..AWS.CPY                                        00170000
//   SET DCLLIB=&CODER..AWS.DCL                                         00180000
//   SET LOADLIB=&CODER..AWS.LOADLIB                                    00190000
//   SET DBRMLIB=&CODER..AWS.DBRMLIB                                    00200000
//   SET SYSLBLK=3200                                                   00210000
//********************************************************************* 00220000
//*  PRECOMPILE THE CODE                                                00230000
//********************************************************************* 00240000
//PRECMP  EXEC PGM=DSNHPC,                                              00250000
//   PARM='HOST(IBMCOB),XREF,SOURCE,FLAG(I),APOST'                      00260000
//STEPLIB  DD DISP=SHR,DSN=OEM.DB2.DAZ1.SDSNEXIT                        00270000
//         DD DISP=SHR,DSN=OEMA.DB2.VERSIONA.SDSNLOAD                   00280000
//SYSIN    DD DISP=SHR,DSN=&SRCLIB(&MEMNAME)                            00290000
//SYSCIN   DD DSNAME=&&DSNHOUT,UNIT=VIO,                                00300000
//            DISP=(NEW,PASS),SPACE=(TRK,(3,3)),                        00310000
//            DCB=(BLKSIZE=&SYSLBLK)                                    00320000
//DBRMLIB  DD DISP=SHR,DSN=&DBRMLIB(&MEMNAME)                           00330000
//SYSLIB   DD DISP=SHR,DSN=&DCLLIB                                      00340000
//         DD DISP=SHR,DSN=&COPYLIB                                     00350000
//SYSPRINT DD SYSOUT=*                                                  00360000
//SYSTERM  DD SYSOUT=*                                                  00370000
//SYSUDUMP DD SYSOUT=*                                                  00380000
//SYSUT1   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00390000
//SYSUT2   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00400000
//********************************************************************* 00410000
//*  COMPILE THE COBOL IF PRECOMPILE STEP RETURN CODE IS 4 OR LESS      00420000
//********************************************************************* 00430000
//COBCMP  EXEC PGM=IGYCRCTL,REGION=0M,COND=(4,LT,PRECMP),               00440000
//             PARM=('SIZE(4000K),BUFSIZE(32760),LIST,LIB,MAP,OBJECT',  00450000
//             'DATA(31),XREF,RENT')                                    00460000
//STEPLIB  DD DSN=IGY.SIGYCOMP,DISP=SHR                                 00470000
//SYSPRINT DD SYSOUT=*                                                  00480000
//SYSTERM  DD SYSOUT=*                                                  00490000
//SYSLIN   DD DSNAME=&&LOADSET,UNIT=VIO,                                00500000
//            DISP=(MOD,PASS),SPACE=(TRK,(3,3)),                        00510000
//            DCB=(BLKSIZE=&SYSLBLK)                                    00520000
//SYSLIB   DD DSN=&COPYLIB,DISP=(MOD,PASS)                              00530000
//SYSDEBUG DD SYSOUT=*                                                  00540000
//SYSIN    DD DSN=&&DSNHOUT,DISP=(OLD,DELETE)                           00550000
//SYSUT1   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00560000
//SYSUT2   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00570000
//SYSUT3   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00580000
//SYSUT4   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00590000
//SYSUT5   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00600000
//SYSUT6   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00610000
//SYSUT7   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00620000
//SYSUT8   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00630000
//SYSUT9   DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00640000
//SYSUT10  DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00650000
//SYSUT11  DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00660000
//SYSUT12  DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00670000
//SYSUT13  DD SPACE=(80,(10,10),,,ROUND),UNIT=VIO                       00680000
//********************************************************************* 00690000
//*  LINKEDIT IF PRECOMPILE AND COMPILE SUCCEED                         00700000
//********************************************************************* 00710000
//LKED   EXEC PGM=IEWL,COND=((4,LT,PRECMP),(4,LT,COBCMP)),REGION=1024K  00720000
//SYSLIB   DD DISP=SHR,DSN=CEE.SCEELKED                                 00730000
//         DD DISP=SHR,DSN=OEMA.DB2.VERSIONA.SDSNLOAD                   00740000
//         DD DISP=SHR,DSN=ISP.SISPLOAD                                 00750000
//         DD DISP=SHR,DSN=GDDM.SADMMOD                                 00760000
//         DD DSN=&LOADLIB,DISP=SHR                                     00770000
//SYSLIN   DD DSNAME=&&LOADSET,DISP=(OLD,DELETE)                        00780000
//         DD DDNAME=SYSIN                                              00790000
//SYSLMOD  DD DSNAME=&LOADLIB(&MEMNAME),                                00800000
//            SPACE=(TRK,(10,10,1)),                                    00810000
//            UNIT=VIO,DISP=(MOD,PASS)                                  00820000
//SYSPRINT DD SYSOUT=*                                                  00830000
//SYSUT1   DD UNIT=VIO,SPACE=(TRK,(10,10))                              00840000
//SYSIN    DD DUMMY                                                     00850000
//********************************************************************* 00860000
//*  BIND STEP                                                          00870000
//********************************************************************* 00880000
//BINDDB  EXEC PGM=IKJEFT01,COND=(4,LT)                                 00890000
//STEPLIB  DD DISP=SHR,DSN=OEM.DB2.DAZ1.SDSNEXIT                        00900000
//         DD DISP=SHR,DSN=OEMA.DB2.VERSIONA.SDSNLOAD                   00910000
//DBRMLIB  DD DISP=SHR,DSN=&DBRMLIB(&MEMNAME)                           00920000
//SYSPRINT DD SYSOUT=*                                                  00930000
//SYSTSPRT DD SYSOUT=*                                                  00940000
//SYSUDUMP DD SYSOUT=*                                                  00950000
//SYSTSIN  DD *                                                         00960000
 DSN    SYSTEM (DAZ1       )                                            00970000
 BIND    MEMBER    (COBDB21)  -                                         00980000
         PLAN      (COBDB21)  -                                         00990000
         ACTION    (REP)      -                                         01000000
         ISOLATION (CS)       -                                         01010000
         VALIDATE  (BIND)     -                                         01020000
         RELEASE   (COMMIT)   -                                         01030000
         OWNER     (AWSCODR)  -                                         01040000
         QUALIFIER (DSN81210) -                                         01050000
         ENCODING  (EBCDIC)                                             01060000
 END                                                                    01070000
 /*                                                                     01080000
//********************************************************************* 01090000
//*  RUN  Db2 COBOL Batch Program                                       01100000
//********************************************************************* 01110000
//RUNDBC  EXEC PGM=IKJEFT01,COND=(4,LT)                                 01120000
//STEPLIB  DD  DISP=SHR,DSN=OEM.DB2.DAZ1.RUNLIB.LOAD                    01130000
//         DD  DISP=SHR,DSN=OEMA.DB2.VERSIONA.SDSNLOAD                  01140000
//SYSPRINT DD SYSOUT=*                                                  01150000
//SYSTSPRT DD SYSOUT=*                                                  01160000
//SYSUDUMP DD SYSOUT=*                                                  01170000
//SYSTSIN  DD *                                                         01180000
  DSN SYSTEM(DAZ1)                                                      01190000
  RUN PROGRAM(COBDB21) -                                                01200000
  PLAN(COBDB21) -                                                       01210000
  LIB('AWSCODR.AWS.LOADLIB')                                            01220000
/*                                                                      01230000
