package com.example.BatchProcessing.job;

import lombok.val;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.batch.core.*;
import org.springframework.batch.test.JobLauncherTestUtils;
import org.springframework.batch.test.JobRepositoryTestUtils;
import org.springframework.batch.test.context.SpringBatchTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Calendar;

@SpringBatchTest
@SpringBootTest
public class PersonBatchTest {

    public static final String INPUT_FILE = "/people-100.csv";

    @Autowired
    private JobLauncherTestUtils jobLauncherTestUtils;

    @Autowired
    private JobRepositoryTestUtils jobRepositoryTestUtils;

    @AfterEach
    public void cleanUp() {
        jobRepositoryTestUtils.removeJobExecutions();
    }


    private JobParameters defaultJobParameters() {
        return new JobParametersBuilder()
                .addString("inputFile", INPUT_FILE)
                .addDate("timestamp", Calendar.getInstance().getTime())
                .toJobParameters();
    }

    @Test
    void givenPersonFlatFile_whenJobExecuted_thenSuccess(@Autowired Job importUserJob) throws Exception {
        // when
        val jobExecution = jobLauncherTestUtils.launchJob(defaultJobParameters());
       // val actualJobInstance = jobExecution.getJobInstance();
        //val actualJobExitStatus = jobExecution.getExitStatus();

        // then
        Assertions.assertEquals("importUserJob", jobExecution.getJobInstance().getJobName(),
                "Job name should be importUserJob");

        Assertions.assertEquals(ExitStatus.COMPLETED.getExitCode(), jobExecution.getExitStatus().getExitCode(),
                "Exit status should be COMPLETED");
    }
}
