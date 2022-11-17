000100 IDENTIFICATION DIVISION.                                         00010000
000200 PROGRAM-ID. COBDB21.                                             00020001
000210********************************************                      00021001
000220*COBOL PROGRAM TO ACCOMPANY JCL TO STEP    *                      00022001
000230*FUNCTION DEMO                             *                      00023001
000220*OVERLY SIMPLIFIED PROGRAM TO FETCH FROM   *                      00022001
000230*A DB2 EMPLOYEE DATABASE USING CURSOR      *                      00023001
000240********************************************                      00024001
000250 ENVIRONMENT DIVISION.                                            00025000
000260 DATA DIVISION.                                                   00026000
000270 WORKING-STORAGE SECTION.                                         00027000
000271*****************************************************             00027101
000272* WORKAREAS                                         *             00027201
000273*****************************************************             00027301
000274 77  NOT-FOUND           PIC S9(9) COMP VALUE  +100.              00027401
000275 77  INPUT-SWITCH        PIC X          VALUE  'Y'.               00027501
000276         88  NOMORE-INPUT               VALUE  'N'.               00027601
000280********************************************                      00028003
000287*  SQL COMMUNICATION AREA                  *                      00028701
000288********************************************                      00028801
000289     EXEC SQL                                                     00028903
000290       INCLUDE SQLCA                                              00029003
000291     END-EXEC.                                                    00029103
000292********************************************                      00029201
000293*  DCLS                                    *                      00029302
000294********************************************                      00029401
000295     EXEC SQL                                                     00029503
000296       INCLUDE EMP                                                00029603
000297     END-EXEC.                                                    00029703
000298********************************************                      00029801
000299*   DCLGENS                                                       00029901
000300********************************************                      00030001
000301     EXEC SQL                                                     00030103
000302       DECLARE CR1 CURSOR FOR                                     00030203
000303         SELECT EMPNO,FIRSTNME,MIDINIT,LASTNAME                   00030308
000310         FROM EMP                                                 00031001
000400     END-EXEC.                                                    00040003
000600 PROCEDURE DIVISION.                                              00060001
000700 MAIN-PARA.                                                       00070001
000800*    DISPLAY " SIMPLE COBOL DB2 CURSOR PROGRAM : "                00080009
000900* OPENING CURSOR                                                  00090001
001000     EXEC SQL                                                     00100003
001100       OPEN CR1                                                   00110003
001200     END-EXEC.                                                    00120003
001300     IF SQLCODE = 0                                               00130003
001400*       DISPLAY " EMP CURSOR OPEN : "                             00140009
001401        DISPLAY "*********************************************"   00140110
001402        DISPLAY "EMPNO ,FIRST NAME  , LAST NAME           "       00140211
001403        DISPLAY "*********************************************"   00140310
001500     ELSE                                                         00150003
001600        DISPLAY ' OPEN FAILED WITH SQLCODE : ' SQLCODE            00160003
001700     END-IF.                                                      00170003
001800     PERFORM FETCH-PARA                                           00180003
001900             UNTIL SQLCODE NOT EQUAL 0                            00190009
001910     EXEC SQL                                                     00191003
001920        CLOSE CR1                                                 00192003
001930     END-EXEC                                                     00193009
001931        DISPLAY "                                        "        00193109
001932        DISPLAY "*********************************************"   00193210
001934        DISPLAY "                 END  OF REPORT              "   00193409
001935        DISPLAY "*********************************************"   00193510
001940     STOP RUN.                                                    00194005
002100 FETCH-PARA.                                                      00210001
002110     INITIALIZE DCLEMP                                            00211009
002200     EXEC SQL                                                     00220001
002300        FETCH CR1                                                 00230003
002310           INTO :DCL-EMPNO,                                       00231003
002320                :DCL-FIRSTNME,                                    00232003
002330                :DCL-MIDINIT,                                     00233007
002340                :DCL-LASTNAME                                     00234003
002400     END-EXEC                                                     00240009
002500     IF SQLCODE = 0                                               00250003
002510        DISPLAY DCL-EMPNO, ","                                    00251003
002520                DCL-FIRSTNME-TEXT , ", "                          00252009
002540                DCL-LASTNAME-TEXT                                 00254008
002550     ELSE                                                         00255003
002560        IF SQLCODE = 100                                          00256003
002570           CONTINUE                                               00257003
002580        ELSE                                                      00258003
002590           DISPLAY 'DB2 ERROR'                                    00259003
002591        END-IF                                                    00259103
002600     END-IF.                                                      00260004
