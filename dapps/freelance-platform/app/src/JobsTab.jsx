import React, { useCallback, useEffect, useState } from 'react';
import PersonTag from './PersonTag.jsx';
import { readContract, writeContract, fromSatoshi } from './sdk.js';
import { addressToHex } from './contract.js';

const STATUS_LABELS = ['Open', 'In Progress', 'Completed', 'Cancelled'];

function JobForm({ onPosted }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await writeContract({ method: 'postJob', args: [title, description], amountWage: parseFloat(budget) });
      setTitle(''); setDescription(''); setBudget('');
      onPosted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h2>Post a job</h2>
      <label>Title<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
      <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} required /></label>
      <label>Budget (WAGE, escrowed on posting)
        <input type="number" step="0.00000001" min="0.00000001" value={budget} onChange={e => setBudget(e.target.value)} required />
      </label>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={busy}>{busy ? 'Posting...' : 'Post job'}</button>
    </form>
  );
}

function ApplyForm({ jobId, onApplied }) {
  const [proposal, setProposal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await writeContract({ method: 'applyToJob', args: [jobId, proposal] });
      setProposal(''); setOpen(false);
      onApplied();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return <button onClick={() => setOpen(true)}>Apply</button>;

  return (
    <form className="inline-form" onSubmit={submit}>
      <textarea placeholder="Your proposal" value={proposal} onChange={e => setProposal(e.target.value)} required />
      {error && <div className="error">{error}</div>}
      <div className="row">
        <button type="submit" disabled={busy}>{busy ? 'Sending...' : 'Submit application'}</button>
        <button type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

// Applications are readable by anyone -- the contract puts no access
// control on getApplication/getApplicationCount, so this list shows for
// every visitor, not just the employer. Only the Hire/Cancel actions below
// are restricted (by the contract itself) to the employer.
function Applicants({ jobId }) {
  const [applicants, setApplicants] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { value: count } = await readContract('getApplicationCount', [jobId]);
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push(await readContract('getApplication', [jobId, i]));
      }
      setApplicants(list);
    } catch (err) {
      setError(err.message);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="error">{error}</div>;
  if (!applicants) return <p className="muted">Loading applicants...</p>;
  if (applicants.length === 0) return <p className="muted">No applicants yet.</p>;

  return (
    <ul className="applicants">
      {applicants.map((a, i) => (
        <li key={i}>
          <PersonTag addressHex={a.freelancer} />
          <p>{a.proposal}</p>
        </li>
      ))}
    </ul>
  );
}

function EmployerControls({ job, jobId, onChanged }) {
  const [hireAddress, setHireAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const act = async (method, args) => {
    setBusy(true);
    setError(null);
    try {
      await writeContract({ method, args });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="employer-controls">
      {error && <div className="error">{error}</div>}
      {job.status === 0 && (
        <>
          <div className="row">
            <input placeholder="freelancer q-address to hire" value={hireAddress}
              onChange={e => setHireAddress(e.target.value)} />
            <button disabled={busy || !hireAddress}
              onClick={() => act('hireFreelancer', [jobId, addressToHex(hireAddress)])}>
              Hire
            </button>
          </div>
          <button disabled={busy} onClick={() => act('cancelJob', [jobId])}>Cancel job (refund escrow)</button>
        </>
      )}
      {job.status === 1 && (
        <button disabled={busy} onClick={() => act('completeJob', [jobId])}>Mark complete &amp; release escrow</button>
      )}
    </div>
  );
}

function JobCard({ jobId, myAddressHex, onChanged }) {
  const [job, setJob] = useState(null);
  const [showApplicants, setShowApplicants] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setJob(await readContract('getJob', [jobId]));
    } catch (err) {
      setError(err.message);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="card error">Job #{jobId}: {error}</div>;
  if (!job) return <div className="card">Loading job #{jobId}...</div>;

  const isEmployer = myAddressHex && job.employer === myAddressHex;

  return (
    <div className="card job-card">
      <div className="job-header">
        <h3>{job.title}</h3>
        <span className={`status status-${job.status}`}>{STATUS_LABELS[job.status]}</span>
      </div>
      <p>{job.description}</p>
      <p className="budget">{fromSatoshi(job.budget)} WAGE escrowed</p>
      <p className="muted">Employer: <PersonTag addressHex={job.employer} /></p>
      {job.status !== 0 && <p className="muted">Freelancer: <PersonTag addressHex={job.freelancer} /></p>}

      {!isEmployer && job.status === 0 && (
        <ApplyForm jobId={jobId} onApplied={() => { load(); onChanged(); }} />
      )}

      <button className="text-toggle" onClick={() => setShowApplicants(s => !s)}>
        {showApplicants ? 'Hide applicants' : 'View applicants'}
      </button>
      {showApplicants && <Applicants jobId={jobId} />}

      {isEmployer && (
        <EmployerControls job={job} jobId={jobId} onChanged={() => { load(); onChanged(); }} />
      )}
    </div>
  );
}

export default function JobsTab({ myAddressHex }) {
  const [jobCount, setJobCount] = useState(null);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const { value } = await readContract('jobCount');
      setJobCount(value);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div>
      <JobForm onPosted={() => setRefreshKey(k => k + 1)} />
      <section>
        <h2>Jobs</h2>
        {error && <div className="error">{error}</div>}
        {jobCount === null && !error && <p>Loading jobs...</p>}
        {jobCount === 0 && <p className="muted">No jobs posted yet -- be the first.</p>}
        {jobCount > 0 && Array.from({ length: jobCount }, (_, i) => jobCount - 1 - i).map(id => (
          <JobCard key={`${id}-${refreshKey}`} jobId={id} myAddressHex={myAddressHex}
            onChanged={() => setRefreshKey(k => k + 1)} />
        ))}
      </section>
    </div>
  );
}
