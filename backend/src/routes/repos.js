const express = require('express');
const router = express.Router();

// GET /api/repos - Get all analyzed repositories
router.get('/', async (req, res) => {
  try {
    // TODO: Implement getting all repositories from database
    const repositories = [
      {
        id: '1',
        name: 'example-repo',
        url: 'https://github.com/user/example-repo',
        lastAnalyzed: new Date().toISOString(),
        status: 'completed',
        score: 85
      }
    ];

    res.json({
      success: true,
      data: repositories
    });
  } catch (error) {
    console.error('Get repositories error:', error);
    res.status(500).json({
      error: 'Failed to get repositories',
      message: error.message
    });
  }
});

// POST /api/repos - Add a new repository for analysis
router.post('/', async (req, res) => {
  try {
    console.log('Received body:', req.body);
    const { name, url, description } = req.body;

    if (!name || !url) {
      // If req.body is empty, likely missing express.json() middleware
      if (!Object.keys(req.body).length) {
        return res.status(400).json({
          error: 'Request body is empty. Make sure to use express.json() middleware and send Content-Type: application/json.'
        });
      }
      return res.status(400).json({
        error: 'Repository name and URL are required'
      });
    }

    // TODO: Implement adding repository to database
    const newRepo = {
      id: Date.now().toString(),
      name,
      url,
      description: description || '',
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    res.status(201).json({
      success: true,
      data: newRepo
    });
  } catch (error) {
    console.error('Add repository error:', error);
    res.status(500).json({
      error: 'Failed to add repository',
      message: error.message
    });
  }
});

// GET /api/repos/:id - Get specific repository details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement getting repository by ID
    const repository = {
      id,
      name: 'example-repo',
      url: 'https://github.com/user/example-repo',
      description: 'An example repository',
      createdAt: new Date().toISOString(),
      lastAnalyzed: new Date().toISOString(),
      status: 'completed',
      analysisResults: {
        codeQuality: { score: 85, issues: 12 },
        dependencies: { outdated: 3, vulnerabilities: 1 },
        security: { score: 90, issues: 2 },
        documentation: { coverage: 75, missing: ['API docs', 'README examples'] }
      }
    };

    res.json({
      success: true,
      data: repository
    });
  } catch (error) {
    console.error('Get repository error:', error);
    res.status(500).json({
      error: 'Failed to get repository',
      message: error.message
    });
  }
});

module.exports = router;






