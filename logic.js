let shortcuts = {};
var table = elementById("sc_table");
var listenersList = new Map();
isPopup = false;

//---------------utils
function getCheckboxId(id) {
	return `checkbox#${id}`;
}

function getRowId(id) {
	return `row#${id}`;
}


function OnDocLoad(fn) {
	if (document.readyState != 'loading') {
		fn();
	}
	else {
		document.addEventListener('DOMContentLoaded', fn)
	}
}

function copyToClipboard(text) {
	var dummy = document.createElement("textarea");
	dummy.setAttribute('readonly', '');
	// to avoid breaking orgain page when copying more words
	// cant copy when adding below this code
	// dummy.style.display = 'none'
	document.body.appendChild(dummy);
	//Be careful if you use texarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
	dummy.value = text;
	dummy.select();
	document.execCommand("copy");
	alert("All the Shortcuts are copied to clipboard as JSON");
	document.body.removeChild(dummy);
}

// Function to download data to a file
function download(data, filename, type) {
	var file = new Blob([data], { type: type });
	if (window.navigator.msSaveOrOpenBlob) // IE10+
		window.navigator.msSaveOrOpenBlob(file, filename);
	else { // Others
		var a = document.createElement("a"),
			url = URL.createObjectURL(file);
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		setTimeout(function () {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		}, 0);
	}
}


function elementById(id) {
	return document.getElementById(id);
}

function getDisplayTextFromURL(url){
	let disp=url;
	disp=disp.replace(/(^\w+:|^)\/\//, '');
	if(disp[disp.length-1]=="/")
	{
		disp=disp.slice(0,-1);
	}
	return disp;
}
//----------------Communication
function reload() {
	refresh();
	deleteTable();
	createTable();
}
function downloadShortcuts() {
	var json_string = JSON.stringify(shortcuts);
	// copyToClipboard(json_string);
	download(json_string, "shortcuts.json", "json");
}

function refresh() {
	//Send message to background to update data

	chrome.runtime.sendMessage({
		command: "load",
		data: shortcuts
	});
	save();
}

function save() {
	chrome.storage.sync.set({ shortcuts });
}

function load(callback) {
	chrome.storage.sync.get('shortcuts', (data) => {
		if (data.shortcuts)
			shortcuts = data.shortcuts;
		callback();
	});
	// refresh();
}

function addAddListener() {
	OnDocLoad(() => {
		var add_button = elementById('add');
		var shortcut_input = elementById('shortcut');
		var url_input = elementById('url');
		var settings_button = elementById('settings');
		var clear_button = elementById('clear');
		var copy_button = elementById("export");
		var import_button = elementById("import");

		if (!isPopup) {
			settings_button.style.visibility = "hidden";
		}
		else {
			settings_button.addEventListener('click', () => {
				chrome.tabs.create({ url: "logic.html" });
				window.close();
			});
		}

		clear_button.addEventListener('click', function () {
			if (window.confirm("Confirm Clear All")) {
				if (window.confirm("Export as JSON")) {
					downloadShortcuts();
				}
				else{
					
				}
				shortcuts = {};
				shortcut_input.value = "";
				url_input.value = "";
				reload();
				shortcut_input.focus();
			}
			else {
			}
		});

		copy_button.addEventListener('click', function () {
			downloadShortcuts();
		});


		import_button.addEventListener('change', function () {
			const files = this.files;
			if (files[0]) {
				try {
					const file = files[0];
					var reader = new FileReader();
					reader.readAsText(file, "UTF-8");
					reader.onload = function (evt) {
						try {
							shortcuts = JSON.parse(evt.target.result);
							reload();
						}
						catch (e) {
							alert("File Cannot be Parsed");
						}
					}
				} catch (e) {
					alert("File Cannot be Read");
				}
				reader.onerror = function (evt) {
					alert("File Cannot be Read");
				}
			}
		});


		add_button.addEventListener('click', function () {
			var key = shortcut_input.value;
			var value = url_input.value;
			addShortcut(key, value);
		});


		[shortcut_input, url_input].forEach((input_element) => {
			input_element.addEventListener("keyup", function (event) {
				if (event.key === 'Enter') {
					// Cancel the default action, if needed
					event.preventDefault();
					// Trigger the button element with a click
					add_button.click();
				}
			});
		});
	});
}


//--------------Short Cuts Operations
function deleteTable() {
	for (const [key, value] of listenersList.entries()) {
		var link = elementById(getCheckboxId(key));
		link.removeEventListener('click', value);
	}
	listenersList.clear();
	table.innerHTML = "";
}

function setAttributes(el, attrs) {
	for (var key in attrs) {
		el.setAttribute(key, attrs[key]);
	}
}

function addRow(key, value) {
	let tr = document.createElement('tr');
	setAttributes(tr, { 'id': getRowId(key) });
	let td1 = document.createElement('td');
	td1.setAttribute('align', 'center');
	let input = document.createElement('input');

	setAttributes(input, {
		'type': 'image',
		'alt': 'x',
		'src': 'icons/close.png',
		'class': 'icon_style',
		'id': getCheckboxId(key)
	});
	td1.appendChild(input);
	var listener = function () {
		deleteShortcut(key);
	};
	input.addEventListener('click', listener);
	listenersList.set(key, listener);


	tr.appendChild(td1);

	let td2 = document.createElement('td');
	setAttributes(td2, {
		'class': 'text_display',
	});
	td2.appendChild(document.createTextNode(key));
	tr.append(td2);

	let td3 = document.createElement('td');
	setAttributes(td3, {
		'class': 'text_display',
	});
	let a=document.createElement("a");
	setAttributes(a,{
		'href':value,
		'target':'_blank'
	})
	a.appendChild(document.createTextNode(getDisplayTextFromURL(value)))
	td3.appendChild(a);
	tr.append(td3);

	table.appendChild(tr);
}

function createTable() {
	deleteTable();
	for (const [key, value] of Object.entries(shortcuts)) {
		addRow(key, value);
	}
}

function addShortcut(key, value, doRefresh = true) {
	if (shortcuts[key] != null)
		deleteShortcut(key, false);
	shortcuts[key] = value;
	addRow(key, value);
	if (doRefresh)
		refresh();
}

function deleteShortcut(key, doRefresh = true) {
	delete shortcuts[key];
	var row = elementById(getRowId(key));
	var link = elementById(getCheckboxId(key));
	link.removeEventListener('click', listenersList[key]);
	listenersList.delete(key);
	row.remove();
	if (doRefresh)
		refresh();
}

//-------------Default Calls
function loadURL() {
	OnDocLoad(() => {
		chrome.runtime.sendMessage({ command: "get_url" }, (url) => {
			addAddListener();
			elementById('url').value = url;
		});
	});
}


function init() {
	try {
		load(createTable);
		loadURL();
	}
	catch (e) {
		console.error(e)
	}
}
init();

chrome.runtime.onMessage.addListener((message) => {
	switch (message.command) {
		case ("reload_URL"):
			loadURL();
			break;
	}
});
