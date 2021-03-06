app.controller("popupCtrl", function ($scope, $timeout, $filter) {
  $scope.sortedIssues = [];
  var injectedTabsUrl = [];
  var emJiraData = localStorage.getItem('emJiraData');
  if (emJiraData != undefined) {
    $scope.sortedIssues = JSON.parse(emJiraData);
  }

  function checkForNewData() {
    chrome.windows.getAll(null, function (wins) {
      for (var j = 0; j < wins.length; ++j) {
        chrome.tabs.getAllInWindow(wins[j].id, function (tabs) {
          for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].url && tabs[i].url.indexOf('/secure/RapidBoard.jspa?') != -1 && injectedTabsUrl.indexOf(tabs[i].url) == -1) {
              injectedTabsUrl.push(tabs[i].url);
              chrome.tabs.executeScript(tabs[i].id, {
                file: "js/injector.js"
              });
            }
          }
        });
      }
    });
  }

  function delDuplicates() {
    var original = [];
    var tokens = [];
    angular.forEach($scope.sortedIssues, function (elem, index) {
      var token = elem.token.substring(0, elem.token.indexOf('|'));
      if (tokens.indexOf(token) == -1) {
        tokens.push(token);
        original.push(elem);
      }
    });
    return original;
  }

  chrome.runtime.onMessage.addListener(function (msg) {
    if(!$scope.sortedIssues) { 
      $scope.sortedIssues = [];
    }
    $timeout(function () {
      $scope.sortedIssues.push({
        pageName: msg.documentTitle,
        token: msg.documentToken,
        jiraUrl: msg.documentUrl,
        columns: msg.columnHeaders,
        lastUpdated: new Date(msg.updated),
        doneNumber: msg.doneNumber,
        issuesLength: msg.issuesLength,
        issues: $filter('orderBy')(msg.sortedIssues, 'assignee')
      });
      var d = new Date();
      var n = d.toUTCString();
      $scope.sortedIssues = $filter('orderBy')($scope.sortedIssues, 'lastUpdated');
      $scope.sortedIssues = delDuplicates();
      localStorage.setItem('emJiraData', JSON.stringify($scope.sortedIssues));
      localStorage.setItem('emJiraLastUpdate', n);
    });
  });

  $scope.openTask = function (href) {
    window.open(href, '_blank');
  };

  $scope.showIssue = function (parentIndex, index) {
    angular.forEach($scope.sortedIssues, function (element) {
      angular.forEach(element.issues, function (issue) {
        issue.showTasks = false;
      });
    });
    $scope.sortedIssues[parentIndex].issues[index].showTasks = lastIndex == index && lastParentIndex == parentIndex ? false : true;
    lastIndex = $scope.sortedIssues[parentIndex].issues[index].showTasks == false ? undefined : index;
    lastParentIndex = $scope.sortedIssues[parentIndex].issues[index].showTasks == false ? undefined : parentIndex;
  };

  $scope.showSortedIssue = function (index) {
    angular.forEach($scope.sortedIssues, function (element) {
      element.show = false;
    });
    $scope.sortedIssues[index].show = lastBoardIndex == index ? false : true;
    lastBoardIndex = $scope.sortedIssues[index].show == false ? undefined : index;
  };

  $scope.generateTaskTitle = function (key, title) {
    var string = title.indexOf(key) != -1 ? title : (key + ' ' + title);
    return string;
  };

  $scope.setIssueStateColor = function (issue, columnData) {
    for (var i = 0; i < columnData.length; i++) {
      var element = columnData[i];
      if (element.innerText == issue.column) {
        return {
          'background-color': columnColors[i]
        };
      }
    }
  };

  $scope.burndown = function($index) {
    $scope.sortedIssues[$index].burndown = !$scope.sortedIssues[$index].burndown;
  }

  $scope.hideTask = function (task, burndown) {
    if (burndown == true && task.todo == true) {
      return false
    }
    
    if (!burndown) {
      return false
    }   
    
    return true;
  };

  function fixBrokenAndOutdatedData() {
    var d = new Date();
    var n = d.toUTCString();
    $scope.sortedIssues = $filter('orderBy')($scope.sortedIssues, 'lastUpdated', true);
    $scope.sortedIssues = delDuplicates();
    localStorage.setItem('emJiraData', JSON.stringify($scope.sortedIssues));
    localStorage.setItem('emJiraLastUpdate', n);
  }

  fixBrokenAndOutdatedData();
  checkForNewData();
});