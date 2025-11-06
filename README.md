# Destination Guide

A Flask web application that suggests travel destinations based on your preferences using Claude AI.

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Get Your Anthropic API Key

1. Visit: https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### 3. Set Environment Variable

**Option A - Temporary (for current session):**

Windows PowerShell:
```powershell
$env:ANTHROPIC_API_KEY="your-api-key-here"
```

Windows Command Prompt:
```cmd
set ANTHROPIC_API_KEY=your-api-key-here
```

**Option B - Permanent (recommended):**

1. Search for "Environment Variables" in Windows
2. Click "Edit the system environment variables"
3. Click "Environment Variables" button
4. Under "User variables", click "New"
5. Variable name: `ANTHROPIC_API_KEY`
6. Variable value: your API key
7. Click OK on all dialogs
8. Restart your terminal/VS Code

**Option C - Use .env file:**

Create a file named `.env` in this directory:
```
ANTHROPIC_API_KEY=your-api-key-here
```

Then install python-dotenv:
```bash
pip install python-dotenv
```

And add this to the top of `app.py`:
```python
from dotenv import load_dotenv
load_dotenv()
```

## Running the App

**Easy way - Use the batch file:**
```cmd
run.bat
```

**Or run directly:**
```cmd
python app.py
```

Then open your browser to: **http://localhost:5000**

## How It Works

1. Fill out the travel preference form
2. Click "Get Suggestion"
3. Claude AI analyzes your preferences
4. Get a personalized destination recommendation with details

## API Usage

The app uses Claude 3.5 Sonnet for generating travel suggestions. Each request costs approximately $0.003 (1000 input tokens) + $0.015 (1000 output tokens).

## Tech Stack

- **Backend**: Flask (Python)
- **AI**: Anthropic Claude 3.5 Sonnet
- **Frontend**: HTML, CSS, JavaScript
