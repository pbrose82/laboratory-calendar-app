// src/components/TestRunner.js
import React, { useState, useEffect, useRef } from 'react';
import { runTests, cleanupTestResources } from '../testing/testUtils';
import { allApiTestSuites } from '../testing/tests/apiTests';
// Import UI tests only in browser environment
import { allUiTestSuites } from '../testing/tests/uiTests';
import './TestRunner.css';

const HISTORY_STORAGE_KEY = 'labCalendarTestHistory';

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
  const [logMessages, setLogMessages] = useState([]);
  const progressRef = useRef(null);
  const resultsSectionRef = useRef(null);

  // Load test history from localStorage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        console.log("Loaded test history:", parsedHistory);
        setTestHistory(parsedHistory);
      } else {
        console.log("No saved test history found");
      }
    } catch (error) {
      console.error('Error loading test history:', error);
      addLogMessage(`Error loading test history: ${error.message}`);
    }
  }, []);
  
  const addLogMessage = (message) => {
    setLogMessages(prev => [...prev, { time: new Date().toLocaleTimeString(), message }]);
  };
  
  // Progress callback function
  const updateProgress = (progressData) => {
    if (progressData.phase === 'complete') {
      setProgress(100);
      addLogMessage("Tests completed");
    } else {
      const progressPercent = Math.round(progressData.progress * 100);
      setProgress(progressPercent);
      if (progressData.suiteName) {
        addLogMessage(`Running suite: ${progressData.suiteName} (${progressPercent}%)`);
      }
    }
  };

  // Handle running tests
  const handleRunTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    setProgress(0);
    setLogMessages([]);
    addLogMessage("Starting test run...");
    
    try {
      // Determine which test suites to run
      const suitesToRun = [];
      
      if (selectedSuites.api) {
        suitesToRun.push(...allApiTestSuites);
        addLogMessage("Including API test suites");
      }
      
      if (selectedSuites.ui) {
        suitesToRun.push(...allUiTestSuites);
        addLogMessage("Including UI test suites");
      }
      
      // Run the tests with progress updates
      const results = await runTests(suitesToRun, updateProgress);
      setTestResults(results);
      addLogMessage(`Tests complete - ${results.passed} passed, ${results.failed} failed`);
      
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
        try {
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
          addLogMessage("Test history saved to localStorage");
        } catch (storageError) {
          console.error("Error saving test history:", storageError);
          addLogMessage(`Error saving test history: ${storageError.message}`);
        }
      }
      
      // Ensure cleanup happens after tests
      addLogMessage("Cleaning up test resources...");
      try {
        await cleanupTestResources();
        addLogMessage("Test resources cleaned up successfully");
      } catch (cleanupError) {
        console.error("Error cleaning up test resources:", cleanupError);
        addLogMessage(`Error cleaning up test resources: ${cleanupError.message}`);
      }
      
      // Scroll to results
      if (resultsSectionRef.current) {
        resultsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error running tests:', error);
      addLogMessage(`Error running tests: ${error.message}`);
      
      // Still try to clean up even if tests fail
      try {
        await cleanupTestResources();
        addLogMessage("Test resources cleaned up after error");
      } catch (cleanupError) {
        addLogMessage(`Error cleaning up test resources: ${cleanupError.message}`);
      }
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
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    addLogMessage("Test history cleared");
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
      
      {/* Progress bar */}
      {isRunning && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            Running tests... {progress}%
          </div>
        </div>
      )}
      
      {/* Log messages */}
      {logMessages.length > 0 && (
        <div className="test-log">
          <h4>Test Log</h4>
          <div className="log-container">
            {logMessages.map((log, index) => (
              <div key={index} className="log-message">
                <span className="log-time">[{log.time}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {testResults && (
        <div className="test-results" ref={resultsSectionRef}>
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
