// src/components/TestRunner.js
import React, { useState, useEffect, useRef } from 'react';
import { runTests } from '../testing/testUtils';
import { allApiTestSuites } from '../testing/tests/apiTests';
// Import UI tests only in browser environment
import { allUiTestSuites } from '../testing/tests/uiTests';
import './TestRunner.css';

const TestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [selectedSuites, setSelectedSuites] = useState({
    api: true,
    ui: true
  });
  const [expandedSuites, setExpandedSuites] = useState({});
  const [saveHistory, setSaveHistory] = useState(true);
  const [testHistory, setTestHistory] = useState([]);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);
  const resultsSectionRef = useRef(null);

  // Load test history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('testRunHistory');
    if (savedHistory) {
      try {
        setTestHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading test history:', error);
      }
    }
  }, []);
  
  // Progress callback function
  const updateProgress = (progressData) => {
    if (progressData.phase === 'complete') {
      setProgress(100);
    } else {
      setProgress(Math.round(progressData.progress * 100));
    }
  };

  // Handle running tests
  const handleRunTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    setProgress(0);
    
    try {
      // Determine which test suites to run
      const suitesToRun = [];
      
      if (selectedSuites.api) {
        suitesToRun.push(...allApiTestSuites);
      }
      
      if (selectedSuites.ui) {
        suitesToRun.push(...allUiTestSuites);
      }
      
      // Run the tests with progress updates
      const results = await runTests(suitesToRun, updateProgress);
      setTestResults(results);
      
      // Add to history if enabled
      if (saveHistory) {
        const historyEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          summary: {
            totalTests: results.totalTests,
            passed: results.passed,
            failed: results.failed,
            skipped: results.skipped,
            duration: results.totalDuration
          }
        };
        
        const newHistory = [historyEntry, ...testHistory].slice(0, 10); // Keep last 10 runs
        setTestHistory(newHistory);
        
        // Save to localStorage
        localStorage.setItem('testRunHistory', JSON.stringify(newHistory));
      }
      
      // Scroll to results
      if (resultsSectionRef.current) {
        resultsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Toggle suite expansion
  const toggleSuiteExpansion = (suiteName) => {
    setExpandedSuites(prev => ({
      ...prev,
      [suiteName]: !prev[suiteName]
    }));
  };

  // Clear test history
  const clearHistory = () => {
    setTestHistory([]);
    localStorage.removeItem('testRunHistory');
  };

  // Format duration in ms to readable format
  const formatDuration = (durationMs) => {
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else {
      return `${(durationMs / 1000).toFixed(2)}s`;
    }
  };

  return (
    <div className="test-runner">
      <div className="test-runner-header">
        <h3>Automated Testing</h3>
        <p className="subtitle">Run automated tests to verify application functionality</p>
      </div>
      
      <div className="test-runner-controls">
        <div className="suite-selection">
          <label className="suite-checkbox">
            <input
              type="checkbox"
              checked={selectedSuites.api}
              onChange={(e) => setSelectedSuites(prev => ({ ...prev, api: e.target.checked }))}
            />
            <span>API Tests</span>
          </label>
          
          <label className="suite-checkbox">
            <input
              type="checkbox"
              checked={selectedSuites.ui}
              onChange={(e) => setSelectedSuites(prev => ({ ...prev, ui: e.target.checked }))}
            />
            <span>UI Tests</span>
          </label>
          
          <label className="suite-checkbox">
            <input
              type="checkbox"
              checked={saveHistory}
              onChange={(e) => setSaveHistory(e.target.checked)}
            />
            <span>Save History</span>
          </label>
        </div>
        
        <button
          className="run-tests-button"
          onClick={handleRunTests}
          disabled={isRunning || (!selectedSuites.api && !selectedSuites.ui)}
        >
          {isRunning ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Running Tests...
            </>
          ) : (
            <>
              <i className="fas fa-play"></i>
              Run Tests
            </>
          )}
        </button>
      </div>
      
      {testResults && (
        <div className="test-results">
          <div className="results-summary">
            <div className="result-card">
              <div className="result-value">{testResults.totalTests}</div>
              <div className="result-label">Total Tests</div>
            </div>
            
            <div className="result-card passed">
              <div className="result-value">{testResults.passed}</div>
              <div className="result-label">Passed</div>
            </div>
            
            <div className="result-card failed">
              <div className="result-value">{testResults.failed}</div>
              <div className="result-label">Failed</div>
            </div>
            
            <div className="result-card skipped">
              <div className="result-value">{testResults.skipped}</div>
              <div className="result-label">Skipped</div>
            </div>
            
            <div className="result-card">
              <div className="result-value">{formatDuration(testResults.totalDuration)}</div>
              <div className="result-label">Duration</div>
            </div>
          </div>
          
          {/* Test Suites */}
          <div className="test-suites">
            {testResults.suites.map((suite, suiteIndex) => (
              <div className="test-suite" key={suiteIndex}>
                <div
                  className="suite-header"
                  onClick={() => toggleSuiteExpansion(suite.suiteName)}
                >
                  <div className="suite-name">
                    <i className={`fas fa-${expandedSuites[suite.suiteName] ? 'minus' : 'plus'}-circle`}></i>
                    {suite.suiteName}
                  </div>
                  <div className="suite-summary">
                    <span className="suite-count">{suite.tests.length} tests</span>
                    <span className="suite-passed">{suite.passed} passed</span>
                    <span className="suite-failed">{suite.failed} failed</span>
                    <span className="suite-duration">{formatDuration(suite.totalDuration)}</span>
                  </div>
                </div>
                
                {expandedSuites[suite.suiteName] && (
                  <div className="suite-tests">
                    {suite.tests.map((test, testIndex) => (
                      <div className={`test-case ${test.status}`} key={testIndex}>
                        <div className="test-status">
                          {test.status === 'passed' ? (
                            <i className="fas fa-check-circle"></i>
                          ) : test.status === 'failed' ? (
                            <i className="fas fa-times-circle"></i>
                          ) : (
                            <i className="fas fa-minus-circle"></i>
                          )}
                        </div>
                        <div className="test-name">{test.name}</div>
                        <div className="test-duration">{formatDuration(test.duration)}</div>
                      </div>
                    ))}
                    
                    {suite.failed > 0 && (
                      <div className="test-errors">
                        <h4>Errors</h4>
                        {suite.tests
                          .filter(test => test.status === 'failed')
                          .map((test, errorIndex) => (
                            <div className="error-item" key={errorIndex}>
                              <div className="error-test">{test.name}</div>
                              <div className="error-message">{test.error}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Test History */}
      {testHistory.length > 0 ? (
        <div className="test-history">
          <div className="history-header">
            <h3>Test Run History</h3>
            <button className="clear-history-button" onClick={clearHistory}>
              <i className="fas fa-trash"></i>
              Clear History
            </button>
          </div>
          
          <div className="history-list">
            {testHistory.map((entry) => (
              <div className="history-item" key={entry.id}>
                <div className="history-timestamp">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="history-summary">
                  <span className="history-total">{entry.summary.totalTests} tests</span>
                  <span className="history-passed">{entry.summary.passed} passed</span>
                  <span className="history-failed">{entry.summary.failed} failed</span>
                  <span className="history-duration">{formatDuration(entry.summary.duration)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        testResults && (
          <div className="test-history">
            <div className="history-header">
              <h3>Test Run History</h3>
            </div>
            <div className="empty-history">
              <i className="fas fa-history"></i>
              <p>No test history available yet. Enable "Save History" to keep a record of test runs.</p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default TestRunner;
