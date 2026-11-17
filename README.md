# ComplaintLens

ComplaintLens reads the messages customers send to a company's support desk, in English or
French, and does what a support agent does first: it works out what each message is about, how
serious it is and which team should handle it, writes a reply based on the company's policies and
the customer's own ride record, checks that reply, and then either sends it or hands it to a
person. Every step is recorded and shown live.

NLP semester project 2026–2027, by Mohamed Aziz Mansour and Rimel Zouari.

**New here? Read [`docs/guide.md`](docs/guide.md) first.** It explains the whole project in plain
language: what each step does, which method it uses and why, what we measured, and a glossary of
every technical term.

## Live demo

The demo runs as the support desk of **LunaGo**, a fictional ride-hailing app (fictional so that
nobody is impersonated; the models are trained and evaluated on real, public support data).

| | |
|---|---|
| Portal (start here: two buttons) | https://kirazul.github.io/LunaGO/ |
| LunaGo customer site (EN/FR) | https://kirazul.github.io/LunaGO/en/ |
| ComplaintLens console (staff) | https://kirazul.github.io/LunaGO/console/ |
| API (interactive docs) | https://api-production-a4e30.up.railway.app/docs |

Send a message from any channel and watch it appear in the console within seconds. The API sleeps
when idle to stay within the free plan, so the first request after a pause takes about 20 seconds.

| Channel | How | Where the reply goes |
|---|---|---|
| Email | write to `lunagocare@agentmail.to` | an email reply in the same thread (about a minute) |
| Contact form | customer site, "Contact" (optional ride ID) | the ticket's tracking page |
| Live chat | customer site, "Live support" | the chat itself; the conversation continues there |
| Ride rating | customer site, "Rate a ride" (stars + comment) | the ticket's tracking page |
| Community forum | [GitHub Discussions](https://github.com/Kirazul/LunaGO/discussions) of this repository | a comment in the thread |

## How it works

![Customers write on five channels; the API understands the message, checks the ride record and answers; a verified reply goes to the customer, anything else goes to an agent](docs/architecture/1-overview.png)

Every message goes through the same six steps, always in this order. Each step is one file in
[`src/complaintlens/pipeline/`](src/complaintlens/pipeline/):

| # | Step | What it does | File |
|---|---|---|---|
| 1 | Normalize | Keeps only what the customer wrote this time (removes quoted old emails and signatures) | `normalize.py` |
| 2 | Mask personal data | Replaces email addresses, phone numbers and card numbers with placeholders before any external service sees the text | `pii.py` |
| 3 | Language | Detects English or French; any other language goes to a person | `language.py` |
| 4 | Understand | Labels the message: complaint or not, topic, seriousness (1–4), urgency, risk (safety, injury, legal threat…) | `understand.py` |
| 5 | Link | Finds the customer and, for a ride problem, the ride by its ID on that customer's account; extracts the facts of that ride | `link.py` |
| 6 | Respond | Picks the team and the priority, finds the relevant policy sections, drafts a reply that cites them, verifies it, decides what to do | `respond.py` |

The decision at the end is one of five:

| Decision | When |
|---|---|
| Send automatically | the reply passed every check, involves no money, and the system is confident |
| Ask for the ride ID | a ride problem without a valid ride ID (nothing is guessed from "last night" or an amount) |
| Wait for an agent | money is involved, a check failed, there is doubt, or the message gives orders to the AI; the AI's draft waits in the console |
| Escalate | safety, injury, harassment, a legal threat, or the highest seriousness: a person handles it |
| No reply | spam, or nothing to answer |

`service.py` runs the steps on a conversation and sends what must be sent. The full picture, with
the channels and the offline research, is in
[`docs/architecture/`](docs/architecture/architecture.html) (four diagrams).

## Run it on your computer

You need [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 by itself), Node 24 and pnpm.
Commands are for Windows PowerShell and work the same on macOS and Linux.

```powershell
uv sync                                          # 1. install the Python packages (exact versions)
uv run python ml/scripts/fetch_complaints2019.py # 2. download the small public training data (~1 MB)
uv run python ml/scripts/train_classical.py      # 3. train the classical models (a few seconds)
uv run complaintlens serve                       # 4. start the API: http://localhost:8000/docs
```

In a second terminal, start the website and the console:

```powershell
cd apps/web
pnpm install
pnpm dev          # http://localhost:3000 (portal), /en (customer site), /console (staff)
```

Console sign-in on your computer: `admin` / `admin`.

It runs like this with no account and no key: the classical models label the messages and every
answer waits for an agent. To get AI-written replies and email, copy `.env.example` to `.env` and
fill in the keys you want (each one is explained in that file):

```powershell
copy .env.example .env
uv run complaintlens check    # tells you whether the LLM key and the mailbox work
```

- `LLM_API_KEY`: a free [Groq](https://console.groq.com) key. Replies are then drafted, cited and
  verified.
- Email: a free [AgentMail](https://agentmail.to) inbox (100 emails a day). It receives and
  replies over HTTPS, which matters because the free hosting plan blocks the usual email ports.
  Any IMAP/SMTP mailbox (for example Gmail with an app password) also works with
  `EMAIL_INBOX=imap`.

Try one message from the command line and read what each step did:

```powershell
uv run complaintlens send "J'ai été facturé deux fois pour ma course d'hier soir !" --sender you@example.com
```

### Everything with Docker (one command)

```powershell
docker compose up --build      # website :3000, console :3000/console, API :8000/docs
```

The API image downloads the public 2019 complaint data, trains the classical models and fetches
the embedding model while it builds, so no model file is stored in git.

## Check your changes

Run these before every commit; the same checks run on GitHub (workflow `ci.yml`).

```powershell
uv run ruff check .            # Python: common mistakes
uv run ruff format .           # Python: formatting
uv run pytest                  # Python: all tests (no network needed)
```

Three tests use the trained classical models (steps 2 and 3 of the quick start); until the models
exist they are skipped, and pytest prints the two commands to run.

```powershell
cd apps/web
pnpm lint                      # website: common mistakes
pnpm exec next typegen; pnpm exec tsc --noEmit   # website: types
pnpm build                     # website: the static site builds
```

## Layout

| Path | What |
|---|---|
| `src/complaintlens/pipeline/` | The six steps, one file each; `base.py` runs them; `injection.py` stops a message from giving orders to the AI |
| `src/complaintlens/service.py` | Runs the steps on a conversation, applies the decision, sends the replies |
| `src/complaintlens/rag/` | The policy knowledge base and its search (keyword search, meaning-based search, search by summary) |
| `src/complaintlens/channels/` | Email (AgentMail, IMAP/SMTP) |
| `src/complaintlens/api/` | The web API: `public` (anyone), `account` (customers), `staff` (console), `research` (Insights, Annotate), `relay` (forum, webhooks), `inbox` (email poller), `main` (startup) |
| `src/complaintlens/` (other files) | `schemas.py` shared types · `store.py` database tables · `settings.py` configuration · `auth.py`, `security.py` sign-in and rate limits · `rides.py`, `demo_data.py` LunaGo's simulated rides · `gate.py`, `trends.py`, `topics.py`, `rootcause.py`, `silver.py`, `annotation.py` research modules · `cli.py` the `complaintlens` command |
| `apps/web/` | Next.js app: the portal (`/`), the LunaGo customer site (`/en`, `/fr`) and the ComplaintLens console (`/console`). The moving background is the Dithering shader of [Paper Shaders](https://shaders.paper.design) |
| `company/help_center/` | LunaGo's policies (EN/FR): the knowledge base the replies cite (private: not shown on the website) |
| `ml/scripts/` | Data preparation, baselines, training; one script per experiment |
| `eval/` | Annotation guidelines, the items to annotate, the retrieval questions, the prompt-injection test messages (ours, and a sample written by other people) |
| `reports/results/` | Every reported number, as a JSON file written by a script |
| `reports/report/` | The LaTeX report |
| `docs/` | The guide, the plan, the proposal, the architecture diagrams |
| `tests/` | Python tests |
| `infra/`, `docker-compose.yml`, `.github/workflows/` | Docker images; CI, website deploy, forum relay |
| `data/`, `models/` | Created on your computer (downloads, the local database, trained models); never in git |

The website reads four optional build-time settings: `NEXT_PUBLIC_API_URL` (default
`http://localhost:8000`), `NEXT_PUBLIC_BASE_PATH` (set by GitHub Pages), `NEXT_PUBLIC_SUPPORT_EMAIL`
and `NEXT_PUBLIC_FORUM_URL`.

## The console

The console is for staff only. The first administrator is created at startup from
`ADMIN_USERNAME` / `ADMIN_PASSWORD` (on your computer, without a password: `admin` / `admin`).
Administrators add agents on the **Team** page; everyone can change their own password from the
account menu. Lost password: `uv run complaintlens set-password admin`.

In a conversation the agent sees the AI's suggestion in the reply box (send it, edit it, or write
their own), why the AI decided what it did, and the **Ride check**: the ride the message is about,
what the customer says compared with the ride's record, and the facts the reply may state (every
number in a reply is checked against them). Once an agent has replied, the AI only prepares
drafts in that conversation.

## How it is hosted (free)

| Part | Where | How it updates |
|---|---|---|
| Website and console | GitHub Pages (static export) | workflow `pages.yml`, on every push to `main` that touches `apps/web`; the API address comes from the repository variable `API_URL` |
| API, models, database | Railway (Docker image `infra/api.Dockerfile`, SQLite on a 500 MB volume at `/app/data`) | `railway up --service api` from the repository root |
| Community forum relay | GitHub Actions, workflow `relay.yml` | runs on each new Discussion, and hourly to collect email and post agents' replies |

Railway service variables: `LLM_API_KEY`, `EMAIL_INBOX`, `EMAIL_ADDRESS`, `AGENTMAIL_API_KEY`,
`AGENTMAIL_WEBHOOK_SECRET`, `ADMIN_PASSWORD`, `CHANNEL_TOKEN`, `PUBLIC_BASE_URL`, `CORS_ORIGINS`,
`DATABASE_URL` (`sqlite:////app/data/app.db`) and `RAILWAY_RUN_UID=0` (the volume is owned by
root). The service uses the health check `/api/health` and sleeps when idle. GitHub: secret
`CHANNEL_TOKEN` (same value as on Railway) and variable `API_URL`.

Email arrives through a webhook (AgentMail calls the API as soon as mail arrives), with polling
every 30 seconds while the API is in use and hourly by the relay as a safety net.

## Data

Data files are never stored in git.

1. *Complaints on Twitter* (Preoțiuc-Pietro et al., 2019) with severity labels (Jin & Aletras,
   2021): the two small files the classical models are trained on.

   ```powershell
   uv run python ml/scripts/fetch_complaints2019.py
   ```

2. *Customer Support on Twitter* (Kaggle, CC BY-NC-SA 4.0): only needed for the research
   experiments (trends, topics, the Insights page), not to run the system.

   ```powershell
   uv tool install kaggle --python 3.12 --with six   # the CLI forgets to declare `six`
   kaggle auth login                                  # opens the browser
   kaggle datasets download thoughtvector/customer-support-on-twitter -p data/raw/twcs --unzip
   uv run python -m complaintlens.data.twcs data/raw/twcs/twcs/twcs.csv --brand Uber_Support --out data/interim/uber_first_contacts.parquet
   ```

## Reproduce the reported numbers

Every number in the plan and the report comes from a file in `reports/results/`. Each file is
written by one script; run it as `uv run python ml/scripts/<script> <arguments>`.

| Result file | Script and arguments |
|---|---|
| `baseline_complaints2019.json` | `baseline_complaints2019.py --out reports/results/baseline_complaints2019.json` |
| `baseline_complaints2019_ungrouped_ablation.json` | `baseline_complaints2019.py --no-grouping --out reports/results/baseline_complaints2019_ungrouped_ablation.json` |
| `published_reference_complaints2019.json` | not computed: the published scores, copied from the papers' tables |
| `gate_complaints2019.json` | `eval_gate.py --out reports/results/gate_complaints2019.json` |
| `retrieval_helpcenter.json` | `eval_retrieval.py --models sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 --out reports/results/retrieval_helpcenter.json` |
| `retrieval_helpcenter_bm25only.json` | `eval_retrieval.py --out reports/results/retrieval_helpcenter_bm25only.json` |
| `retrieval_int8.json` | `eval_quantization.py --out reports/results/retrieval_int8.json` |
| `retrieval_summary.json` (needs `LLM_API_KEY`) | `eval_retrieval_summary.py --out reports/results/retrieval_summary.json` |
| `retrieval_summary_int8.json` (needs `LLM_API_KEY`) | `eval_retrieval_summary.py --int8 --out reports/results/retrieval_summary_int8.json` |
| `eda_uber_first_contacts.json` | `eda_first_contacts.py data/interim/uber_first_contacts.parquet --out reports/results/eda_uber_first_contacts.json` |
| `trends_uber.json` | `eval_trends.py --out reports/results/trends_uber.json` |
| `topics_uber.json` | `eval_topics.py --out reports/results/topics_uber.json` |
| `insights_uber.json` | `build_insights.py --out reports/results/insights_uber.json` |
| `rootcause_simulation.json` | `eval_rootcause.py --out reports/results/rootcause_simulation.json` |
| `injection_attacks.json` (needs `LLM_API_KEY`) | `eval_injection.py --out reports/results/injection_attacks.json` |
| `injection_attacks_no_defence.json` (needs `LLM_API_KEY`) | `eval_injection.py --no-defence --out reports/results/injection_attacks_no_defence.json` |

What each one needs: the `baseline_` and `gate_` files need the 2019 complaint data; the
`retrieval_` files, `rootcause_simulation.json` and the `injection_` files need no dataset
(only this repository; with the Kaggle data present, `injection_attacks.json` also reports the
detector's false alarms on real messages); the Uber files (`eda_`, `trends_`, `topics_`, `insights_`) need the
Kaggle dataset (see "Data").

## More

- The project explained in plain language: [`docs/guide.md`](docs/guide.md)
- Research plan and all results: [`docs/plan.md`](docs/plan.md)
- Project proposal: [`docs/proposal.md`](docs/proposal.md)
- Annotation guidelines: [`eval/annotation_guidelines.md`](eval/annotation_guidelines.md)
