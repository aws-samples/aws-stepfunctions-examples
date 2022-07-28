## Sample Mainframe Code to accompany JCL to Step Function Blog
==============================================================
The code elements supplied are 

1. AWSSTEPF.JCL : Sample JCL which is redeveloped as a step function
2. AWSDBCMP.JCL : JCL to compile the COBOL Program called by above JCL
3. COBDB21.CBL  : A simple COBOL Db2 program to read and extract data
                  from an Employee table
4. DCLEMP.DCL   : DCL Gen that describes the above employee table
5. EMP.CPY      : The COBOL copybook layout equivalent to the table 

## Overview of the AWSSTEPF.JCL 
==============================================================

   This Sample JCL attempts to demonstrate the complexity of routing flow 
   through steps within a mainframe batch job using JCL Condition  
   Code Checking and IF END IF conditions to Control Flow
   
   Below is an explanation of the "HAPPY path"
   
   ****************************************************************** 
   1) Step 1 (DELETEF) always runs.It deletes previous run output  
   2) Step 2 (EXTRDB2) run based on Cond =(0,NE)
      If 0 is not equal condition code of step 1 DELETEF
      We extract Employee data from a Db2 table using a COBOL program
      It may end with condition code 4 if no data is found
      or a higher condition code if some processing error occured
   3) Step 3 (EMPTYCHK) checks for COND=(4,LT)
      If 4 is not less than condition codes from Step 1 and Step 2
      Check the new employee file to see whether it is empty
      If it is we forcibly set the return code to 8
      If the file has data, we will get a return code of 0
   4) Step 4 (COMPAREF) is run based on JCL IF condition checking
      If the return code from Step 3 (EMPTYCHK) is 0
      Compare the keys in Db2 and employee files
      If the file has employees not in Db2 output to NOMATCH file
   5) Step 5 (EMPTYD2F) will run if the above IF condition is met
      It additionally has a COND=(4,LT)
      That is it will run if Step 3 (EMPTYCHK) return code is 0
       AND if 4 is not less than the return code for ANY of the steps 
      before the EMPTYD2F Step 
   6) Step 6 (SENDTOHR) is in a nested IF Condition
      If the condition code from step 5 EMPTYD2F is zero it will copy
      the file to be processed to another dataset for processing by
      another department

## In the Real world 
==============================================================

   In production environments, such JCLs are generally accompanied
   by a restart guide that give detailed instructions on 
   how to recover if Step 1 fails, Step 2 fails and so on.
   
   Often these guides dont give any details other than
   an application support number to call if the job fails.
   
   There are also tools like CA-11 that automate recovery to some
   extent. These require expert configuration.

## Also ... like in the Real world 
==============================================================
   There is some commented code
   It is not unusual to find such confusing comments in old JCLs 
   These usually dont help with the  debugging