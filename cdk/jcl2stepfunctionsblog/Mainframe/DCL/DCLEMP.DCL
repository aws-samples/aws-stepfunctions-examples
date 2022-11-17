      ******************************************************************
      * DCLGEN TABLE(DSN81210.EMP)                                     *
      *        LIBRARY(AWSCODR.AWS.DCL(DCLEMP))                        *
      *        ACTION(REPLACE)                                         *
      *        LANGUAGE(COBOL)                                         *
      *        QUOTE                                                   *
      *        LABEL(YES)                                              *
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
           10 EMPNO                PIC X(6).
      *    *************************************************************
           10 FIRSTNME.
              49 FIRSTNME-LEN      PIC S9(4) USAGE COMP.
              49 FIRSTNME-TEXT     PIC X(12).
      *    *************************************************************
           10 MIDINIT              PIC X(1).
      *    *************************************************************
           10 LASTNAME.
              49 LASTNAME-LEN      PIC S9(4) USAGE COMP.
              49 LASTNAME-TEXT     PIC X(15).
      *    *************************************************************
           10 WORKDEPT             PIC X(3).
      *    *************************************************************
           10 PHONENO              PIC X(4).
      *    *************************************************************
           10 HIREDATE             PIC X(10).
      *    *************************************************************
           10 JOB                  PIC X(8).
      *    *************************************************************
           10 EDLEVEL              PIC S9(4) USAGE COMP.
      *    *************************************************************
           10 SEX                  PIC X(1).
      *    *************************************************************
           10 BIRTHDATE            PIC X(10).
      *    *************************************************************
           10 SALARY               PIC S9(7)V9(2) USAGE COMP-3.
      *    *************************************************************
           10 BONUS                PIC S9(7)V9(2) USAGE COMP-3.
      *    *************************************************************
           10 COMM                 PIC S9(7)V9(2) USAGE COMP-3.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 14      *
      ******************************************************************
