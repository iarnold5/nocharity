# ⚖️ NoCharity — Billionaire Philanthropy & Income Parity Calculator

> An interactive web application and Model Context Protocol (MCP) server that tracks billionaire donations reported in the news across selected timeframes, calculates donations as a percentage of their net worth, and translates those percentages into everyday dollars based on your personal monthly income.

---

## ✨ Features

1. **Reality Check Parity Engine**:
   - Converts multi-million and billion-dollar donations into exact **percentages of total net worth**:
     $$\text{Generosity Ratio} = \left(\frac{\text{Donated Amount}}{\text{Net Worth}}\right) \times 100$$
   - Multiplies that exact ratio by your **take-home monthly income** to show what their sacrifice equals on your budget:
     $$\text{Your Equivalent} = \text{Monthly Income} \times \left(\frac{\text{Generosity Ratio}}{100}\right)$$
   - Displays sobering, tangible everyday comparisons (e.g., *"Equivalent to a single pack of gum ($0.45)"*, *"A cup of filter coffee ($1.85)"*, *"A subway ticket ($2.75)"*).

2. **Timeframe-Based News Tracking**:
   - Filter by **All Time**, **2026 Recent**, **2025 Calendar**, **Past 2 Years**, **Past 5 Years**, or **2020–2023**.
   - Verified records from Forbes Philanthropy rankings, Bloomberg, SEC Form 990 tax filings, Chronicle of Philanthropy, and the Giving Pledge directory.

3. **100% Free Live MCP News Integration**:
   - On-demand **Live MCP Web Scan** queries real-time Google News RSS feeds for any billionaire and timeframe.
   - Automatically extracts donation figures, news headlines, publication dates, and source URLs.
   - Requires **$0** and **zero paid API keys**.

4. **Dual Visualizations**:
   - **Cards Grid**: Rich cards with avatar monograms, giving pledge status, Forbes Philanthropy scores, and parity callouts.
   - **Comparative Bar Chart**: Visual horizontal bar comparison ranking billionaires by generosity ratio.

---

## 🤖 MCP Servers Architecture (100% Free)

This application includes a fully standard **Model Context Protocol (MCP)** server built with `@modelcontextprotocol/sdk` in [`mcp-server.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/mcp-server.js).

### The MCP Tools:

| Tool Name | Parameters | Purpose | Cost |
| :--- | :--- | :--- | :--- |
| `search_billionaire_news` | `billionaireName`, `timeframe` | Scrapes real-time news headlines, dates, and amounts via Google News RSS | **$0 (Free, No API Key)** |
| `calculate_donation_parity` | `netWorth`, `donationAmount`, `userMonthlyIncome`, `currency` | Computes percentage of net worth and converts it to personal income parity | **$0 (Free)** |
| `get_billionaires_list` | `timeframe` | Returns verified billionaire roster, net worth, Giving Pledge status, and donation history | **$0 (Free)** |

---

## 🚀 Quick Start (Local)

### 1. Install dependencies:
```bash
npm install
```

### 2. Start the web application:
```bash
npm start
```
Open your browser to: **`http://localhost:3000`**

### 3. Run the MCP Server directly (stdio):
```bash
npm run mcp
```

---

## 🔌 Connecting to AI Clients (Claude Desktop / Antigravity)

Add this entry to your `mcp_config.json` (or Claude Desktop configuration file):

```json
{
  "mcpServers": {
    "billionaire-philanthropy": {
      "command": "node",
      "args": [
        "e:/PersonalProjects/ProjectFiles/AI Slop/nocharity/mcp-server.js"
      ],
      "env": {}
    }
  }
}
```

---

## 🌐 How to Host on the Internet For Free

You can deploy this application on the web completely for free using any of the following platforms:

### Option A: Render.com (Recommended Free Full-Stack Web Service)
1. Push this project to a GitHub repository.
2. Sign in to [Render.com](https://render.com) (free tier).
3. Click **New +** → **Web Service** → Select your repository.
4. Settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Render deploys the app and provides a free HTTPS URL (e.g. `https://nocharity.onrender.com`).

### Option B: Hugging Face Spaces (Free Docker / Node Space)
1. Go to [Hugging Face Spaces](https://huggingface.co/spaces) and click **Create new Space**.
2. Select **Docker** or **Static** SDK, license: **MIT**.
3. Upload files or link your GitHub repo.
4. Hugging Face runs it 24/7 with zero cost and no subscription.

### Option C: GitHub Pages (100% Free Static Mode)
- The [`public/`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/public) directory is built with a resilient client-side fallback using [`public/js/data.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/public/js/data.js).
- You can enable GitHub Pages directly on the `public/` directory or root to host it statically at zero cost forever.
