// ============================================================
// Spring Batch CSV Data Pipeline - Execution Engine & Simulator
// Simulating: PersonBatchConfig, FlatFileItemReader, ItemWriter,
// FaultTolerant Skip Policy & StepExecution Listener
// ============================================================

// Source Records from people-100.csv
let SOURCE_DATA = [];
let dbRecords = [];
let isJobRunning = false;
let currentRunId = 1;

// Load Embedded CSV dataset (100 rows)
fetch('./people.json')
  .then(res => res.json())
  .then(data => {
    SOURCE_DATA = data;
    initApp();
  })
  .catch(err => {
    console.warn('Fallback loading JSON:', err);
  });

function initApp() {
  logConsole('INFO', 'org.springframework.boot.StartupLogging', 'Starting BatchProcessingApplication using Java 17.0.10 on worker-node with PID 4280');
  logConsole('INFO', 'org.springframework.boot.StartupLogging', 'Active profiles: default');
  logConsole('INFO', 'o.s.b.w.embedded.tomcat.TomcatWebServer', 'Tomcat initialized with port 8081 (http)');
  logConsole('INFO', 'o.s.b.c.r.s.JobRepositoryFactoryBean', 'Initializing Spring Batch JobRepository with in-memory H2 schema');
  logConsole('INFO', 'c.e.BatchProcessingApplication', 'Started BatchProcessingApplication in 1.482 seconds (JVM running for 2.102)');
  logConsole('INFO', 'c.e.B.jobRunner.JobRunner', 'JobRunner registered. Ready to trigger importUserJob on demand.');

  switchCodeTab('config');
  renderDatabaseTable();
}

// Java Code Snippets for Viewer
const JAVA_CODE = {
  config: `package com.example.BatchProcessing.job;

import com.example.BatchProcessing.Listener.PersonListener;
import com.example.BatchProcessing.entity.Person;
import com.example.BatchProcessing.repository.PersonRepository;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.launch.support.RunIdIncrementer;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.file.FlatFileItemReader;
import org.springframework.batch.item.file.FlatFileParseException;
import org.springframework.batch.item.file.mapping.BeanWrapperFieldSetMapper;
import org.springframework.batch.item.file.mapping.DefaultLineMapper;
import org.springframework.batch.item.file.transform.DelimitedLineTokenizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
public class PersonBatchConfig {

    @Autowired
    PersonRepository repository;

    // 1. FlatFileItemReader for CSV
    @Bean
    public FlatFileItemReader<Person> reader() {
        FlatFileItemReader<Person> reader = new FlatFileItemReader<>();
        reader.setResource(new ClassPathResource("/people-100.csv"));
        reader.setLinesToSkip(1); // Skip header line

        DefaultLineMapper<Person> lineMapper = new DefaultLineMapper<>();
        DelimitedLineTokenizer tokenizer = new DelimitedLineTokenizer();
        tokenizer.setDelimiter(",");
        tokenizer.setNames("Index", "userId", "firstName", "lastName", "sex", "email", "phone", "dateOfBirth", "jobTitle");

        lineMapper.setLineTokenizer(tokenizer);
        lineMapper.setFieldSetMapper(new BeanWrapperFieldSetMapper<>() {{
            setTargetType(Person.class);
        }});

        reader.setLineMapper(lineMapper);
        return reader;
    }

    // 2. ItemProcessor (Business logic & filtering)
    @Bean
    public ItemProcessor<Person, Person> processor() {
        return person -> person; // Identity pass-through or enrichment
    }

    // 3. ItemWriter (Batch database chunk insert)
    @Bean
    public ItemWriter<Person> writer() {
        return items -> {
            System.out.println("Saving Invoice Records: " + items);
            repository.saveAll(items);
        };
    }

    // 4. Step Object with Chunk & Fault-Tolerant Skip Policy
    @Bean
    public Step step1(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        return new StepBuilder("step1", jobRepository)
                .<Person, Person> chunk(5, transactionManager)
                .faultTolerant().skip(FlatFileParseException.class)
                .skipLimit(2)
                .reader(reader())
                .processor(processor())
                .writer(writer())
                .build();
    }

    // 5. Job Object with RunIdIncrementer & Listener
    @Bean
    public Job importUserJob(JobRepository jobRepository, Step step1) {
        return new JobBuilder("importUserJob", jobRepository)
                .incrementer(new RunIdIncrementer())
                .listener(new PersonListener())
                .start(step1)
                .build();
    }
}`,

  entity: `package com.example.BatchProcessing.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@Getter
@Setter
@NoArgsConstructor
public class Person {

    @Id
    private Long Index;

    private String UserId;
    private String FirstName;
    private String LastName;
    private String Sex;
    private String Email;
    private String Phone;
    private String Date_of_birth;
    private String JobTitle;

    public void setDateOfBirth(String dateOfBirth) {
        this.Date_of_birth = dateOfBirth;
    }
}`,

  runner: `package com.example.BatchProcessing.jobRunner;

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
        JobParameters jobParameters = new JobParametersBuilder()
                .addLong("time", Long.valueOf(System.currentTimeMillis()))
                .toJobParameters();

        jobLauncher.run(importUserJob, jobParameters);
        System.out.println("JOB Execution completed!");
    }
}`,

  listener: `package com.example.BatchProcessing.Listener;

import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobExecutionListener;
import org.springframework.stereotype.Component;

@Component
public class PersonListener implements JobExecutionListener {

    @Override
    public void beforeJob(JobExecution jobExecution) {
        System.out.println("Job Started at: " + jobExecution.getStartTime());
        System.out.println("Status: " + jobExecution.getStatus());
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        if (jobExecution.getStatus() == BatchStatus.COMPLETED) {
            System.out.println("Job Finished Successfully at: " + jobExecution.getEndTime());
        }
    }
}`
};

function switchCodeTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event?.target?.classList?.add('active');
  const codeEl = document.getElementById('codeSnippetContent');
  if (codeEl && JAVA_CODE[tab]) {
    codeEl.textContent = JAVA_CODE[tab];
  }
}

// Log to Terminal Console
function logConsole(level, logger, msg) {
  const container = document.getElementById('consoleLogs');
  if (!container) return;

  const now = new Date().toISOString();
  const line = document.createElement('div');
  line.className = 'log-line';

  let levelClass = 'log-info';
  if (level === 'DEBUG') levelClass = 'log-debug';
  if (level === 'WARN') levelClass = 'log-warn';
  if (level === 'ERROR') levelClass = 'log-warn';

  line.innerHTML = `
    <span class="log-time">${now}</span> 
    <span class="${levelClass}">${level.padEnd(5)}</span> 
    <span class="log-time">4280 --- [main]</span> 
    <span class="log-step">${logger.padEnd(35)}</span> : 
    <span class="log-msg">${escapeHtml(msg)}</span>
  `;

  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clearConsoleLogs() {
  document.getElementById('consoleLogs').innerHTML = '';
}

function copyConsoleLogs() {
  const text = document.getElementById('consoleLogs').innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert('Terminal logs copied to clipboard!');
  });
}

// UI State Updates
function updateChunkConfig() {
  const size = document.getElementById('chunkSizeSelect').value;
  document.getElementById('nodeWriterStat').textContent = `Chunk commit size: ${size}`;
}

// ============================================================
// BATCH JOB EXECUTION SIMULATOR
// ============================================================
async function triggerBatchJob() {
  if (isJobRunning) return;
  if (!SOURCE_DATA || SOURCE_DATA.length === 0) {
    alert('Source records are still loading, please wait 1 second.');
    return;
  }

  isJobRunning = true;
  document.getElementById('btnRunJob').disabled = true;

  const chunkSize = parseInt(document.getElementById('chunkSizeSelect').value, 10);
  const skipLimit = parseInt(document.getElementById('skipLimitSelect').value, 10);
  const injectCorrupt = document.getElementById('corruptToggle').checked;

  const jobInstanceId = currentRunId++;
  const startTime = Date.now();

  // Reset Metrics & UI
  document.getElementById('globalStatusBadge').className = 'pipeline-status-badge';
  document.querySelector('.status-indicator').className = 'status-indicator running';
  document.getElementById('globalStatusText').textContent = 'JOB STATUS: EXECUTING';

  document.getElementById('metricJobInstance').textContent = `Instance ID: #job-${jobInstanceId}`;
  document.getElementById('metricStatus').textContent = 'EXECUTING';
  document.getElementById('metricExitCode').textContent = 'ExitCode: RUNNING';
  document.getElementById('metricRead').textContent = '0';
  document.getElementById('metricWrite').textContent = '0';
  document.getElementById('metricSkip').textContent = '0';
  document.getElementById('metricCommit').textContent = '0';
  document.getElementById('metricDuration').textContent = '0 ms';

  dbRecords = [];
  renderDatabaseTable();

  // Start Logging
  logConsole('INFO', 'o.s.b.c.l.support.SimpleJobLauncher', `Job: [SimpleJob: [name=importUserJob]] launched with run.id=${jobInstanceId}, chunkSize=${chunkSize}, skipLimit=${skipLimit}`);
  logConsole('INFO', 'c.e.B.Listener.PersonListener', `Job Started at: ${new Date().toISOString()}`);
  logConsole('INFO', 'o.s.batch.core.job.SimpleStepHandler', `Executing step: [step1]`);

  // Activate nodes visually
  setNodeActive('nodeReader', true);

  // Prepare records to process
  let itemsToProcess = JSON.parse(JSON.stringify(SOURCE_DATA));
  let corruptIndices = [];

  if (injectCorrupt) {
    // Corrupt record at index 14 and index 37
    corruptIndices = [14, 37];
    logConsole('WARN', 'c.e.B.jobRunner.JobRunner', `Simulating 2 corrupted CSV lines at line 15 & line 38 to trigger FlatFileParseException`);
  }

  const totalItems = itemsToProcess.length;
  let readCount = 0;
  let writeCount = 0;
  let skipCount = 0;
  let commitCount = 0;

  // Process in chunks
  const totalChunks = Math.ceil(totalItems / chunkSize);

  for (let c = 0; c < totalChunks; c++) {
    const chunkStart = c * chunkSize;
    const chunkEnd = Math.min(chunkStart + chunkSize, totalItems);
    const currentChunkRaw = itemsToProcess.slice(chunkStart, chunkEnd);

    // Reading & Processing
    setNodeActive('nodeReader', true);
    setNodeActive('nodeProcessor', true);

    let processedChunk = [];

    for (let i = 0; i < currentChunkRaw.length; i++) {
      const item = currentChunkRaw[i];
      const globalIdx = chunkStart + i;
      readCount++;

      // Check for corrupted record
      if (injectCorrupt && corruptIndices.includes(globalIdx)) {
        skipCount++;
        logConsole('WARN', 'o.s.b.c.s.i.FaultTolerantChunkProcessor', `FlatFileParseException on line ${globalIdx + 2}: token count mismatch. Record skipped (${skipCount}/${skipLimit})`);
        if (skipCount > skipLimit) {
          // Exceeded skip limit - job failure!
          logConsole('ERROR', 'o.s.batch.core.step.AbstractStep', `Skip limit exceeded [${skipCount} > ${skipLimit}]. Terminating step execution.`);
          handleJobFailure('SKIP_LIMIT_EXCEEDED');
          return;
        }
      } else {
        processedChunk.push(item);
      }
    }

    // Step 3: Writer
    setNodeActive('nodeProcessor', false);
    setNodeActive('nodeWriter', true);
    setNodeActive('nodeDatabase', true);

    if (processedChunk.length > 0) {
      writeCount += processedChunk.length;
      commitCount++;

      // Save to database
      dbRecords.push(...processedChunk);

      logConsole('DEBUG', 'c.e.B.job.PersonBatchConfig', `Saving Person Records: Chunk ${c + 1}/${totalChunks} (${processedChunk.length} entities written)`);
      logConsole('INFO', 'o.s.batch.core.step.item.ChunkOrientedTasklet', `Committed chunk ${c + 1} of ${totalChunks} (commitCount=${commitCount}, totalWritten=${writeCount})`);
    }

    // Update Progress
    const pct = Math.round(((c + 1) / totalChunks) * 100);
    document.getElementById('progressFill').style.width = `${pct}%`;
    document.getElementById('progressPercentage').textContent = `${pct}%`;
    document.getElementById('progressSub').textContent = `Processing chunk ${c + 1}/${totalChunks} · Read: ${readCount} · Written: ${writeCount}`;

    // Update live metrics
    document.getElementById('metricRead').textContent = readCount;
    document.getElementById('metricWrite').textContent = writeCount;
    document.getElementById('metricSkip').textContent = skipCount;
    document.getElementById('metricCommit').textContent = commitCount;
    document.getElementById('metricDuration').textContent = `${Date.now() - startTime} ms`;

    renderDatabaseTable();

    // Small delay to animate visually
    await new Promise(r => setTimeout(r, 70));
  }

  // Final Step: Complete Job
  const duration = Date.now() - startTime;
  setNodeActive('nodeReader', false);
  setNodeActive('nodeProcessor', false);
  setNodeActive('nodeWriter', false);
  setNodeActive('nodeDatabase', false);

  logConsole('INFO', 'c.e.B.Listener.PersonListener', `Job Finished! Total execution time: ${duration}ms, Status: COMPLETED, Records persisted: ${writeCount}, Skipped: ${skipCount}`);
  logConsole('INFO', 'o.s.b.c.l.support.SimpleJobLauncher', `Job: [SimpleJob: [name=importUserJob]] completed with status: [COMPLETED] in ${duration}ms`);

  document.querySelector('.status-indicator').className = 'status-indicator complete';
  document.getElementById('globalStatusText').textContent = 'JOB STATUS: COMPLETED';
  document.getElementById('metricStatus').textContent = 'COMPLETED';
  document.getElementById('metricExitCode').textContent = 'ExitCode: COMPLETED';
  document.getElementById('metricDuration').textContent = `${duration} ms`;
  document.getElementById('progressSub').textContent = `✅ Batch execution finished in ${duration} ms (${writeCount} rows committed)`;

  isJobRunning = false;
  document.getElementById('btnRunJob').disabled = false;
}

function handleJobFailure(reason) {
  isJobRunning = false;
  document.getElementById('btnRunJob').disabled = false;

  document.querySelector('.status-indicator').className = 'status-indicator failed';
  document.getElementById('globalStatusText').textContent = 'JOB STATUS: FAILED';
  document.getElementById('metricStatus').textContent = 'FAILED';
  document.getElementById('metricExitCode').textContent = `ExitCode: FAILED (${reason})`;
  document.getElementById('progressSub').textContent = `❌ Batch job terminated abnormally: ${reason}`;

  setNodeActive('nodeReader', false);
  setNodeActive('nodeProcessor', false);
  setNodeActive('nodeWriter', false);
  setNodeActive('nodeDatabase', false);
}

function setNodeActive(nodeId, isActive) {
  const el = document.getElementById(nodeId);
  if (el) {
    if (isActive) el.classList.add('active');
    else el.classList.remove('active');
  }
}

function resetPipeline() {
  if (isJobRunning) return;
  dbRecords = [];
  renderDatabaseTable();

  document.getElementById('progressFill').style.width = '0%';
  document.getElementById('progressPercentage').textContent = '0%';
  document.getElementById('progressSub').textContent = 'Idle · Waiting to launch';

  document.querySelector('.status-indicator').className = 'status-indicator ready';
  document.getElementById('globalStatusText').textContent = 'JOB STATUS: READY';

  document.getElementById('metricStatus').textContent = 'READY';
  document.getElementById('metricExitCode').textContent = 'ExitCode: NOOP';
  document.getElementById('metricRead').textContent = '0';
  document.getElementById('metricWrite').textContent = '0';
  document.getElementById('metricSkip').textContent = '0';
  document.getElementById('metricCommit').textContent = '0';
  document.getElementById('metricDuration').textContent = '0 ms';

  logConsole('INFO', 'c.e.B.jobRunner.JobRunner', 'Resetting Spring Data JPA repository and in-memory H2 schema tables.');
}

// ============================================================
// DATABASE TABLE RENDERING & FILTERING
// ============================================================
function renderDatabaseTable() {
  const tbody = document.getElementById('personTableBody');
  const countLabel = document.getElementById('recordCountLabel');
  if (!tbody) return;

  const query = (document.getElementById('tableSearchInput')?.value || '').toLowerCase();
  const genderFilter = document.getElementById('genderFilter')?.value || 'ALL';

  const filtered = dbRecords.filter(p => {
    const matchesGender = (genderFilter === 'ALL') || (p.Sex === genderFilter);
    const fullName = `${p['First Name']} ${p['Last Name']}`.toLowerCase();
    const email = (p.Email || '').toLowerCase();
    const job = (p['Job Title'] || '').toLowerCase();
    const matchesQuery = fullName.includes(query) || email.includes(query) || job.includes(query);
    return matchesGender && matchesQuery;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-dim); padding: 32px;">
          ${dbRecords.length === 0 ? 'No records persisted in database. Click "▶ Run Batch Job" to execute the pipeline.' : 'No matching records found for this filter.'}
        </td>
      </tr>
    `;
    countLabel.textContent = `Showing 0 / ${dbRecords.length} records`;
    return;
  }

  filtered.forEach(p => {
    const isMale = p.Sex === 'Male';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><code>#${p.Index}</code></td>
      <td><code>${p['User Id']}</code></td>
      <td><strong>${p['First Name']} ${p['Last Name']}</strong></td>
      <td><span class="gender-badge ${isMale ? 'gender-male' : 'gender-female'}">${p.Sex}</span></td>
      <td>${p.Email}</td>
      <td><code>${p.Phone}</code></td>
      <td>${p['Date of birth']}</td>
      <td><strong>${p['Job Title']}</strong></td>
      <td><span class="status-badge-persisted">Persisted</span></td>
    `;
    tbody.appendChild(row);
  });

  countLabel.textContent = `Showing ${filtered.length} / ${dbRecords.length} persisted records`;
}

function filterTable() {
  renderDatabaseTable();
}

function exportDatabaseJson() {
  if (dbRecords.length === 0) {
    alert('Database is currently empty. Run the batch job first!');
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbRecords, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", `person_entity_table_${Date.now()}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function downloadSourceCsv() {
  window.open('people-100.csv', '_blank');
}
