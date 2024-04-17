package com.example.BatchProcessing.job;

import com.example.BatchProcessing.Listener.PersonListener;
import com.example.BatchProcessing.entity.Person;
import com.example.BatchProcessing.repository.PersonRepository;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecutionListener;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.EnableBatchProcessing;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.file.FlatFileItemReader;
import org.springframework.batch.item.file.mapping.BeanWrapperFieldSetMapper;
import org.springframework.batch.item.file.mapping.DefaultLineMapper;
import org.springframework.batch.item.file.separator.DefaultRecordSeparatorPolicy;
import org.springframework.batch.item.file.transform.DelimitedLineTokenizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration

public class PersonBatchConfig {
    @Bean
    public FlatFileItemReader<Person> reader() {

        FlatFileItemReader<Person> reader = new FlatFileItemReader<>();
        reader.setResource(new ClassPathResource("/people-100.csv"));
        reader.setLinesToSkip(1);
        reader.setLineMapper(new DefaultLineMapper<>() {{
            setLineTokenizer(new DelimitedLineTokenizer() {{
                setDelimiter(",");
                setNames("Index", "userId", "firstName", "lastName", "sex", "email", "phone", "dateOfBirth", "jobTitle");
            }});

            setFieldSetMapper(new BeanWrapperFieldSetMapper<>() {{
                setTargetType(Person.class);
            }});
        }});
        return reader;
    }

    //Autowire InvoiceRepository
    @Autowired
    PersonRepository repository;

    //Writer class Object
    @Bean
    public ItemWriter<Person> writer(){
        // return new InvoiceItemWriter(); // Using lambda expression code instead of a separate implementation
        return Person -> {
            System.out.println("Saving Invoice Records: " +Person);
            repository.saveAll(Person);
        };
    }

    //Processor class Object
    @Bean
    public ItemProcessor<Person, Person> processor(){
        // return new InvoiceProcessor(); // Using lambda expression code instead of a separate implementation
        return person -> {
            return person;
        };
    }

    //Listener class Object
    @Bean
    public JobExecutionListener listener() {
        return new PersonListener();
    }


    //Step Object
    @Bean
    public Step step1(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
            return new StepBuilder("step1", jobRepository)
                    .<Person, Person> chunk(5, transactionManager)
                    .reader(reader())
                    .processor(processor())
                    .writer(writer())
                    .build();
    }


    //Job Object
    @Bean
    public Job importUserJob(JobRepository jobRepository, Step step1) {
            return new JobBuilder("importUserJob", jobRepository)
                    .incrementer(new RunIdIncrementer())
                    .listener(new PersonListener())
                    .start(step1)
                    .build();
        }


}


