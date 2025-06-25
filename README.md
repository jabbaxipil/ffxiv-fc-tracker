# FFXIV FC Tracker

A React-based web application for tracking Free Company members' collectibles progress in Final Fantasy XIV. This tool helps FC leaders and members track completion status of mounts, minions, and achievements across all members.

## Features

### Free Company Management
- **Member Management**: Add FC members manually or import from Free Company lists
- **Character Sync**: Automatically sync member progress with FFXIVCollect data
- **Avatar Display**: Shows character avatars and completion statistics
- **Batch Operations**: Sync all members' progress with one click

### Content Tracking
- **Mounts**: Track all available mounts and their acquisition sources
- **Minions**: Monitor minion collection progress across FC members
- **Achievements**: Follow achievement completion status
- **Source Filtering**: Filter content by acquisition method (raids, trials, crafting, etc.)

### Progress Visualization
- **Member Progress**: Individual completion percentages for each member
- **FC-wide Statistics**: Overall completion rates for each collectible
- **Visual Indicators**: Color-coded progress tracking and member badges
- **Content Filtering**: View missing vs. owned items across the FC

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/ffxiv-fc-tracker.git
cd ffxiv-fc-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view the application.

### Deployment

This project is configured for Vercel deployment with serverless API functions:

```bash
npm run build
```

The build folder will contain the optimized production files ready for deployment.

## Technology Stack

- **Frontend**: React 18 with Hooks
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **API**: Vercel Serverless Functions
- **Data Source**: FFXIVCollect API
- **Deployment**: Vercel

## Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── App.js             # Main application component
│   ├── App.css            # Application styles
│   ├── index.css          # Global styles with Tailwind
│   └── index.js           # Application entry point
├── api/
│   ├── character/         # Character data endpoints
│   ├── content/           # Content data endpoints
│   └── freecompany/       # FC member list endpoints
└── package.json           # Dependencies and scripts
```

## API Endpoints

### Character Endpoints
- `GET /api/character/search?name={name}&server={server}` - Search for character
- `GET /api/character/{lodestoneId}` - Get character collection data

### Content Endpoints
- `GET /api/content/mounts` - Get all available mounts
- `GET /api/content/minions` - Get all available minions
- `GET /api/content/achievements` - Get all available achievements

### Free Company Endpoints
- `GET /api/freecompany/{id}` - Get FC member list

## Usage Guide

### Adding Members
1. **Manual Entry**: Enter character name and server (e.g., "Cloud Strife@Excalibur")
2. **FC Import**: Use the FC member import feature to bulk add members
3. **Sync Progress**: Click sync buttons to update member collection data

### Tracking Progress
1. **Content Filters**: Select content type (mounts/minions/achievements)
2. **Source Filters**: Filter by acquisition method (all, raid, trial, etc.)
3. **Progress View**: Toggle between "missing" and "owned" content views
4. **Member Status**: View individual member completion rates

### Data Management
- **Auto-sync**: Member data syncs with FFXIVCollect automatically
- **Manual Refresh**: Use sync buttons for immediate updates
- **Error Handling**: Failed syncs are clearly indicated with retry options

## Data Sources

This application uses the [FFXIVCollect](https://ffxivcollect.com) API to retrieve:
- Character collection data
- Content databases (mounts, minions, achievements)
- Free Company member lists

## Configuration

### Environment Variables
Create a `.env.local` file for local development:
```
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
```

For production deployment, the API automatically detects the Vercel environment.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FFXIVCollect](https://ffxivcollect.com) for providing the comprehensive FFXIV collection API
- The FFXIV community for inspiration and feedback
- React and Vercel teams for excellent development tools

---

**Note**: This application is not affiliated with Square Enix or Final Fantasy XIV. It's a community-created tool for tracking collectibles progress.
