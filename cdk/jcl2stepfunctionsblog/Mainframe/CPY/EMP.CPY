      ******************************************************************
      * DCLGEN TABLE(DSN81210.EMP)                                     *
      *        LIBRARY(AWSCODR.AWS.DCL(EMP))                           *
      *        ACTION(REPLACE)                                         *
      *        LANGUAGE(COBOL)                                         *
      *        NAMES(DCL-)                                             *
      *        QUOTE                                                   *
      *        LABEL(YES)                                              *
      *        COLSUFFIX(YES)                                          *
      * ... IS THE DCLGEN COMMAND THAT MADE THE FOLLOWING STATEMENTS   *
      ******************************************************************
           EXEC SQL DECLARE DSN81210.EMP TABLE
           ( EMPNO                          CHAR(6) NOT NULL,
             FIRSTNME                       VARCHAR(12) NOT NULL,
             MIDINIT                        CHAR(1) NOT NULL,
             LASTNAME                       VARCHAR(15) NOT NULL,
             WORKDEPT                       CHAR(3),
             PHONENO                        CHAR(4),
             HIREDATE                       DATE,
             JOB                            CHAR(8),
             EDLEVEL                        SMALLINT,
             SEX                            CHAR(1),
             BIRTHDATE                      DATE,
             SALARY                         DECIMAL(9, 2),
             BONUS                          DECIMAL(9, 2),
             COMM                           DECIMAL(9, 2)
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE DSN81210.EMP                       *
      ******************************************************************
       01  DCLEMP.
      *    *************************************************************
      *                       EMPNO
           10 DCL-EMPNO            PIC X(6).
      *    *************************************************************
           10 DCL-FIRSTNME.
      *                       FIRSTNME LENGTH
              49 DCL-FIRSTNME-LEN
                 PIC S9(4) USAGE COMP.
      *                       FIRSTNME
              49 DCL-FIRSTNME-TEXT
                 PIC X(12).
      *    *************************************************************
      *                       MIDINIT
           10 DCL-MIDINIT          PIC X(1).
      *    *************************************************************
           10 DCL-LASTNAME.
      *                       LASTNAME LENGTH
              49 DCL-LASTNAME-LEN
                 PIC S9(4) USAGE COMP.
      *                       LASTNAME
              49 DCL-LASTNAME-TEXT
                 PIC X(15).
      *    *************************************************************
      *                       WORKDEPT
           10 DCL-WORKDEPT         PIC X(3).
      *    *************************************************************
      *                       PHONENO
           10 DCL-PHONENO          PIC X(4).
      *    *************************************************************
      *                       HIREDATE
           10 DCL-HIREDATE         PIC X(10).
      *    *************************************************************
      *                       JOB
           10 DCL-JOB              PIC X(8).
      *    *************************************************************
      *                       EDLEVEL
           10 DCL-EDLEVEL          PIC S9(4) USAGE COMP.
      *    *************************************************************
      *                       SEX
           10 DCL-SEX              PIC X(1).
      *    *************************************************************
      *                       BIRTHDATE
           10 DCL-BIRTHDATE        PIC X(10).
      *    *************************************************************
      *                       SALARY
           10 DCL-SALARY           PIC S9(7)V9(2) USAGE COMP-3.
      *    *************************************************************
      *                       BONUS
           10 DCL-BONUS            PIC S9(7)V9(2) USAGE COMP-3.
      *    *************************************************************
      *                       COMM
           10 DCL-COMM             PIC S9(7)V9(2) USAGE COMP-3.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 14      *
      ******************************************************************
