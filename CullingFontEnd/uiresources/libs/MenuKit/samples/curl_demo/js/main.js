curl.config({
  baseUrl: '../../',
  paths: {
    curl: 'components/curl/src/curl',
    GameMenu:  'lib/js/menu',
    'layout': 'samples/curl_demo/css/main.css'
  },
});

curl(['GameMenu',
      'css!layout'])
.then(function(GameMenu) {
  // start Menu config
  var startButtons = [
    {label: 'New Game',
     callback: function() {swapMenus(startMenu, newGameMenu);}},
    {label: 'Options',
     callback: function() {swapMenus(startMenu, optionsMenu);}},
    {label: 'Quit',
     callback: function() {swapMenus(startMenu, quitGameMenu);}}
  ];

  var startMenu = new GameMenu({
    buttons: startButtons,
  });

  // options Menu config
  var optionButtons = [
    {label: 'Audio', callback: audioOptions},
    {label: 'Video', callback: videoOptions},
    {label: 'Back',
     callback: function() {swapMenus(optionsMenu, startMenu);}}
  ];

  // Hide menu after build
  var optionsMenu = new GameMenu({
    buttons: optionButtons,
  }).hide();

  function audioOptions() {}

  function videoOptions() {}

  // new Game Menu config
  var newGameButtons = [
    {label: 'Easy', style: 'success', callback: easy},
    {label: 'Medium', style: 'info', callback: medium},
    {label: 'Hard', style: 'danger', callback: hard},
    {label: 'Back',
     callback: function() {swapMenus(newGameMenu, startMenu);}
    }
  ];

  // Hide menu after build
  var newGameMenu = new GameMenu({
    buttons: newGameButtons
  }).hide();

  function easy() {}

  function medium() {}

  function hard() {}

  // quit game config
  var quitButtons = [
    {label: 'Yes', callback: quitGame},
    {label: 'No',
     callback: function() {swapMenus(quitGameMenu, startMenu);}
    }
  ];

  // Hide menu after build
  var quitGameMenu = new GameMenu({
    buttons: quitButtons,
  }).hide();

  function quitGame() {}

  function swapMenus(oldMenu, newMenu) {
    oldMenu.hide();
    newMenu.show();
  }
});
