package com.example.BatchProcessing.jobRunner;

import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class JobRunner implements CommandLineRunner {

    @Autowired
    private JobLauncher jobLauncher;

    @Autowired
    private Job importUserJob;

    @Override
    public void run(String... args) throws Exception {

        JobParameters jobParameters =
                new JobParametersBuilder()
                        .addLong("time", Long.valueOf(System.currentTimeMillis()))
                        .toJobParameters();

        jobLauncher.run(importUserJob, jobParameters);
        System.out.println("JOB Execution completed!");
    }
}
