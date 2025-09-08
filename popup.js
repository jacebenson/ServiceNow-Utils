var tabid;
var cookieStoreId;
var g_ck;
var url;
var instance;
var urlFull;
var userName;
var roles;
var dtUpdateSets;
var dtUpdates;
var dtNodes;
var dtTables;
var dtDataExplore;
var dtSlashcommands;
var objCustomCommands = {};
var ipArr = [];
var jsnNodes;

var objSettings;
var tablesloaded = false;
var nodesloaded = false;
var dataexploreloaded = false;
var userloaded = false;
var updatesetsloaded = false;
var updatesloaded = false;
var myFrameHref;
var datetimeformat;
var table;
var sys_id;
var isNoRecord = true;
var tabIndex = -1;

// Changelog functionality
function initChangelog() {
    // Get required elements
    const changelogContent = document.getElementById('changelog-content');
    const showMoreBtn = document.getElementById('show-more-changelog');
    const badge = document.getElementById('changelog-badge');
    let seenVersion = null;
    let isExpanded = false;
    let allEntries = [];

    // Guard: Only proceed if all required elements exist
    if (!changelogContent || !showMoreBtn || !badge) {
        return;
    }

    // Parse markdown changelog into structured data
    function parseChangelog(markdown) {
        const entries = [];
        let currentEntry = null;
        let currentSection = null;
        
        const lines = markdown.split('\n');
        
        for (let line of lines) {
            // Version header
            if (line.startsWith('## ')) {
                if (currentEntry) {
                    entries.push(currentEntry);
                }
                const match = line.match(/## ([\d.]+) \(([\d-]+)\)/);
                if (match) {
                    currentEntry = {
                        version: match[1],
                        date: match[2],
                        features: [],
                        fixes: []
                    };
                    currentSection = null;
                }
            }
            // Section header
            else if (line.startsWith('Features:')) {
                currentSection = 'features';
            }
            else if (line.startsWith('Fixes / changes:')) {
                currentSection = 'fixes';
            }
            // Entry line
            else if (line.trim().startsWith('- ') && currentEntry && currentSection) {
                const content = line.trim().substring(2);
                currentEntry[currentSection].push(content);
            }
        }
        
        // Add the last entry
        if (currentEntry) {
            entries.push(currentEntry);
        }
        
        return entries;
    }

    // Render changelog entries
    function renderChangelog(expanded = false) {
        if (!allEntries.length) return;
        
        // Clear existing content
        changelogContent.textContent = '';
        
        allEntries.forEach((entry, index) => {
            if (!expanded && index >= 3) return;
            
            // Create version container
            const versionDiv = document.createElement('div');
            versionDiv.className = 'version';
            
            // Create version header
            const headerDiv = document.createElement('div');
            headerDiv.className = 'version-header';
            headerDiv.textContent = `${entry.version} (${entry.date})`;
            versionDiv.appendChild(headerDiv);
            
            // Add features section if exists
            if (entry.features && entry.features.length) {
                const featuresDiv = document.createElement('div');
                featuresDiv.className = 'section features';
                
                const featuresTitle = document.createElement('div');
                featuresTitle.className = 'section-title';
                featuresTitle.textContent = 'Features:';
                featuresDiv.appendChild(featuresTitle);
                
                entry.features.forEach(feature => {
                    const featureDiv = document.createElement('div');
                    featureDiv.className = 'entry';
                    featureDiv.textContent = feature;
                    featuresDiv.appendChild(featureDiv);
                });
                
                versionDiv.appendChild(featuresDiv);
            }
            
            // Add fixes section if exists
            if (entry.fixes && entry.fixes.length) {
                const fixesDiv = document.createElement('div');
                fixesDiv.className = 'section fixes';
                
                const fixesTitle = document.createElement('div');
                fixesTitle.className = 'section-title';
                fixesTitle.textContent = 'Fixes / changes:';
                fixesDiv.appendChild(fixesTitle);
                
                entry.fixes.forEach(fix => {
                    const fixDiv = document.createElement('div');
                    fixDiv.className = 'entry';
                    fixDiv.textContent = fix;
                    fixesDiv.appendChild(fixDiv);
                });
                
                versionDiv.appendChild(fixesDiv);
            }
            
            changelogContent.appendChild(versionDiv);
        });

        if (!expanded) {
            const hiddenDiv = document.createElement('div');
            hiddenDiv.className = 'version hidden';
            hiddenDiv.textContent = '...';
            changelogContent.appendChild(hiddenDiv);
        }
    }

    // Initialize changelog
    fetch(chrome.runtime.getURL('CHANGELOG.md'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(markdown => {
            allEntries = parseChangelog(markdown);
            renderChangelog();
        })
        .catch(error => {
            console.error('Error loading changelog:', error);
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = 'Unable to load changelog. <a href="https://github.com/arnoudkooi/SN-Utils/blob/master/CHANGELOG.md" target="_blank">View on GitHub</a><br><br>';
            changelogContent.textContent = '';
            changelogContent.appendChild(errorDiv);
            showMoreBtn.style.display = 'none';
        });

    // Add version comparison function
    function isSignificantVersionChange(oldVersion, newVersion) {
        if (!oldVersion || oldVersion === "disabled") return true;
        
        const oldParts = oldVersion.split('.').map(Number);
        const newParts = newVersion.split('.').map(Number);
        
        // Ensure both versions have at least 3 parts (major.minor.patch)
        if (oldParts.length < 3 || newParts.length < 3) {
            return true; // If version format is invalid, show the badge to be safe
        }
        
        // Compare major, minor, and patch versions (first three numbers)
        for (let i = 0; i < 3; i++) {
            if (newParts[i] > oldParts[i]) return true;
            if (newParts[i] < oldParts[i]) return false;
        }
        
        // If we get here, the first three numbers are the same
        // Only show badge if the build number (fourth number) changes by more than 4
        // If either version doesn't have a build number, treat it as 0
        const oldBuild = oldParts[3] || 0;
        const newBuild = newParts[3] || 0;
        return Math.abs(newBuild - oldBuild) > 4;
    }

    // Modify the changelog badge check
    chrome.storage.sync.get("changelog_seen_version", (data) => {
        seenVersion = data.changelog_seen_version;
        const currentVersion = chrome.runtime.getManifest().version;
        
        if (badge && seenVersion !== "disabled" && isSignificantVersionChange(seenVersion, currentVersion)) {
            badge.style.display = "inline-block";
            badge.onclick = function() {
                badge.style.display = "none";
                markChangelogSeen();
                showChangelogToast('Changelog marked as seen. The badge will reappear for future updates.');
            };
        } else if (badge) {
            badge.style.display = "none";
        }
    });

    function markChangelogSeen() {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage("changelog_seen");
        }
        chrome.storage.sync.set({ changelog_seen_version: chrome.runtime.getManifest().version });
    }

    // Toggle expanded view
    showMoreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        isExpanded = !isExpanded;
        document.getElementById('changelog').classList.toggle('expanded', isExpanded);
        renderChangelog(isExpanded);
        document.getElementById('changelog-toggle-text').textContent = isExpanded ? 'Show less' : 'Show more changes';
        document.getElementById('changelog-toggle-arrow').style.transform = isExpanded ? 'rotate(180deg)' : 'none';
        // Hide badge and mark as seen when expanding
        if (isExpanded && badge) {
            badge.style.display = "none";
            markChangelogSeen();
        }
    });
}

function setupChangelogBadgeToggle() {
    const toggle = document.getElementById('toggle-changelog-badge');
    const badge = document.getElementById('changelog-badge');
    if (!toggle || !badge) return;
    // Set initial state: checked if not disabled
    chrome.storage.sync.get("changelog_seen_version", (data) => {
        toggle.checked = data.changelog_seen_version !== "disabled";
        // Also show/hide the badge icon immediately
        if (toggle.checked) {
            if (badge.style.display === "none" && (!data.changelog_seen_version || data.changelog_seen_version !== chrome.runtime.getManifest().version)) {
                badge.style.display = "inline-block";
            }
        } else {
            badge.style.display = "none";
        }
    });
    toggle.addEventListener('change', function() {
        if (toggle.checked) {
            // Enable badge: clear the value so badge logic works as normal
            chrome.storage.sync.remove("changelog_seen_version", () => {
                initChangelog();
                badge.style.display = "inline-block";
                chrome.runtime.sendMessage({ event: "updateBadge" });
            });
        } else {
            // Disable badge: set to 'disabled'
            chrome.storage.sync.set({ changelog_seen_version: "disabled" }, () => {
                initChangelog();
                badge.style.display = "none";
                chrome.runtime.sendMessage({ event: "updateBadge" });
            });
        }
    });
}

const airportCodes = {
    "ams": { "city": "Amsterdam", "country": "Netherlands", "region": "Europe" },
    "bne": { "city": "Brisbane", "country": "Australia", "region": "Oceania" },
    "bos": { "city": "Boston", "country": "United States", "region": "North America" },
    "dca": { "city": "Washington, D.C.", "country": "United States", "region": "North America" },
    "hef": { "city": "Manassas", "country": "United States", "region": "North America" },
    "hnd": { "city": "Tokyo", "country": "Japan", "region": "Asia" },
    "iad": { "city": "Dulles", "country": "United States", "region": "North America" },
    "mel": { "city": "Melbourne", "country": "Australia", "region": "Oceania" },
    "ord": { "city": "Chicago", "country": "United States", "region": "North America" },
    "sea": { "city": "Seattle", "country": "United States", "region": "North America" },
    "sin": { "city": "Singapore", "country": "Singapore", "region": "Asia" },
    "sjc": { "city": "San Jose", "country": "United States", "region": "North America" },
    "syd": { "city": "Sydney", "country": "Australia", "region": "Oceania" },
    "vcp": { "city": "Campinas", "country": "Brazil", "region": "South America" },
    "ycg": { "city": "Castlegar", "country": "Canada", "region": "North America" },
    "ytz": { "city": "Toronto", "country": "Canada", "region": "North America" },
    "yul": { "city": "Montreal", "country": "Canada", "region": "North America" },
    "yyz": { "city": "Toronto (Pearson)", "country": "Canada", "region": "North America" },
    "zrh": { "city": "Zurich", "country": "Switzerland", "region": "Europe" }
  };


$.fn.dataTable.ext.errMode = 'none';

document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        tabid = tabs[0].id;
        tabIndex = tabs[0].index;
        cookieStoreId = tabs[0].cookieStoreId || '';
        urlFull = tabs[0].url;
        getBrowserVariables(tabid,cookieStoreId);
        document.querySelector("#snuVersion").innerText = chrome.runtime.getManifest().version;
        //document.querySelector('#leavereview').style.display = 'none';
    });

    if(navigator.userAgent.match(/firefox/i)) $('input[type="color"]').attr('type','text') //bug in FireFox to use html5 color tag in popup

    clearInvalidatedLocalStorageCache();
    initChangelog(); // Initialize changelog functionality
    setupChangelogBadgeToggle(); // Add badge toggle logic

    //document.querySelector('#reqPermission').addEventListener("click", requestPermissionsForCurrentSite);
});

//clear all invalidated cached items like tablenames and nodes
//each items has a accomanied item with a date string value, remove both if not the current day
function clearInvalidatedLocalStorageCache(){
    chrome.storage.local.get(null, function(items) {
        let allKeys = Object.keys(items);
        let dt = new Date().toDateString();
        let arr = []
        allKeys.forEach(key => {
            if (key.endsWith('-date') && dt != items[key]){
                arr.push(key.replace('-date',''));
                 arr.push(key);
            }
    
        })
        chrome.storage.local.remove(arr, () =>{
        let error = chrome.runtime.lastError;
            if (error) {
                console.error(error);
            }
        })
    });
}

//Retrieve variables from browser tab, passing them back to popup
function getBrowserVariables(tid, cStoreId, callback) {
    tabid = tid;
    chrome.tabs.sendMessage(tabid, {
        method: "getVars",
        myVars: "g_ck,g_user_date_time_format,NOW.user.roles,NOW.user.name,NOW.user_name"
    }, function (response) {
        if (response == null || typeof response !== 'object') return;
        g_ck = response.myVars.g_ck || '';
        url = response.url;
        instance = (new URL(url)).host.replace(".service-now.com", "");
        nme = response.myVars.NOWusername || response.myVars.NOWuser_name;
        setBrowserVariables(response);
        console.log(response);
        //callback(response);
    });
}

//Try to retrieve current table and syid from browser tab, passing them back to popup
function getRecordVariables() {
    chrome.tabs.sendMessage(tabid, {
        method: "getVars",
        myVars: "NOW.targetTable,NOW.sysId,mySysId,document.cookie"
    }, function (response) {
        setRecordVariables(response);
    });
}

//Set variables, called by BG page after calling getRecordVariables
function setRecordVariables(obj) {
    console.log(obj)
    isNoRecord = !obj.myVars.hasOwnProperty('NOWsysId');
    sys_id = obj.myVars.NOWsysId || obj.myVars.mySysId;
    table = obj.myVars.NOWtargetTable;

    if (!table)
        table = (myFrameHref || urlFull).match(/com\/(.*).do/)[1].replace('_list', '');
    if (!sys_id)
        sys_id = (getParameterByName('sys_id', myFrameHref || urlFull));


    var xmllink = url + '/' + obj.myVars.NOWtargetTable + '.do?sys_id=' + obj.myVars.NOWsysId + '&sys_target=&XML';
    $('#btnviewxml').click(function () {
        tabCreate({ "url": xmllink, "active": false });
    }).prop('disabled', isNoRecord);



    $('#btnupdatesets').click(function () {
        tabCreate({ "url": url + '/sys_update_set_list.do?sysparm_query=state%3Din%20progress', "active": false });
    });


    $('#waitinglink, #waitingscript').hide();

}


//Try to get saved form state and set it
function setFormFromSyncStorage(callback) {
    var query = instance + "-formvalues";
    chrome.storage.sync.get(query, function (result) {
        if (query in result) {
            $('form').deserialize(result[query]);
        }
        callback();
    });
}

//Try to get json with servicenow tables, first from chrome storage, else via REST api
function prepareJsonTable() {
    var dataset = document.querySelector('#slctdataset').value;
    var query = [instance + "-tables-" + dataset, instance + "-tables-" + dataset + "-date"];
    chrome.storage.local.get(query, function (result) {
        try {
            var thedate = new Date().toDateString();
            if (thedate == result[query[1]].toString()) {
                setDataTableTables(result[query[0]]);
            }
            else{
                getTables(dataset);
            }
                
        }
        catch (err) {
            getTables(dataset);
        }
    });
}

//Query ServiceNow for nodes
function getNodes() {

    let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
        document.querySelector('#nodemessage').innerText = "Node switching may not work in Safari";
    }

    var myurl = url + '/api/now/table/sys_cluster_state?sysparm_query=ORDERBYsystem_id&sysparm_fields=system_id,node_id,status,node_type&sysparm_display_value=true&sysparm_exclude_reference_link=true';
    snuFetch(g_ck, myurl, null, function (jsn) {
        setNodes(jsn.result);
    });
}

async function setActiveNode(node) {
    

    await fetch(url + '/example_add_two_numbers.do'); // call a random leightweight page that returns not found, to make browser aware of new node
    
    let response = await fetch(url + '/stats.do');
    let statsDo = await response.text();
    if (!statsDo.includes('Servlet statistics')) { //after a node switch, sometimes the first call fails. Try again
        response = await fetch(url + '/stats.do');
        statsDo = await response.text();
        console.log('retrying stats.do');
    }

    statsDo = statsDo.replaceAll('<br />', '<br/>'); //fix for some instances
    ipArr = statsDo
        .match(/IP address: ([\s\S]*?)\<br\/>/g)[0]
        .replace('IP address: ', '')
        .replace('<br/>', '')
        .replace('<br />', '')
        .split('.');

    let nodeId = statsDo
    .match(/Node ID: ([\s\S]*?)\<br\/>/g)[0]
    .replace('Node ID: ', '')
    .replace('<br/>', '');

    let nodeName = statsDo
    .match(/Connected to cluster node: ([\s\S]*?)\<br\/>/g)[0]
    .replace('Connected to cluster node: ', '')
    .replace('<br/>', '');

    //let realNode = {"nodeId" : nodeId, "nodeName" : nodeName };
    
    setActiveNodeInner(node);

    function setActiveNodeInner(node) {
        var nodeArr = node.nodeName.split(".");
        var ip34 = nodeArr[0].replace("app", ""); //ie: 28125
        var ipSegments = [ipArr[0], ipArr[1], Number(ip34.slice(0, -3)), Number(ip34.slice(3))];

        var encodedIP = 0;
        for (var i = 0; i < ipSegments.length; i++) {
            var n = (ipSegments[i] * Math.pow(256, i));
            encodedIP += n;
        }


        var myurl = url + '/api/now/table/sys_cluster_node_stats?sysparm_query=node_id=' + node.nodeId + '&sysparm_fields=stats';
        snuFetch(g_ck, myurl, null, function (jsn) {
            var port = ($($.parseXML(jsn.result[0].stats)).find('servlet\\.port').text());
            var encodedPort = Math.floor(port / 256) + (port % 256) * 256;
            var encodeBIGIP = encodedIP + '.' + encodedPort + '.0000';
            chrome.cookies.getAll({
                url: new URL(url).origin
            }, function (instanceCookies) {
                var BIGipServerpoolCookie = instanceCookies.find(function (cookie) {
                    // matches BIGipServerpool_<alphanumeric instance name>
                    return cookie.name.match(/^(BIGipServer[\w\d]+)$/);
                });
                if (!BIGipServerpoolCookie) { //onprem or no cookie found
                    chrome.cookies.set({
                        "name": "glide_user_route",
                        "url": new URL(url).origin,
                        "secure": true,
                        "httpOnly": true,
                        "value": 'glide.' + node.nodeId
                    }, s => {
                        getActiveNode(jsnNodes);
                    });
                }
                else if (!BIGipServerpoolCookie?.value?.endsWith('.0000')){ 
                    //this is a test to allow node switching on ADCv2 migrated instances

                    let ip = ipArr.join('.');
                    let ipPort = ip + ':' + port;
                    let md5IpPort = md5(ipPort);

                    //console.log(md5IpPort, node);

                    chrome.cookies.set({
                        "name": BIGipServerpoolCookie.name,
                        "url": new URL(url).origin,
                        "secure": true,
                        "httpOnly": true,
                        "value": md5IpPort
                    }, s => {
                        chrome.cookies.set({
                            "name": "glide_user_route",
                            "url": new URL(url).origin,
                            "secure": true,
                            "httpOnly": true,
                            "value": 'glide.' + node.nodeId
                        }, s => {
                            getActiveNode(jsnNodes);
                        });
                    });

                    // document.querySelector('#nodemessage').innerText = `This instance uses ADCv2 loadbalancing, node switching may not work or switch to a random node. Try a few times... `;
                    // document.querySelector('#nodemessage').classList.remove('hidden');
                }
                else { //classic node switching

                    chrome.cookies.set({
                        "name": BIGipServerpoolCookie.name,
                        "url": new URL(url).origin,
                        "secure": true,
                        "httpOnly": true,
                        "value": encodeBIGIP
                    }, s => {
                        chrome.cookies.set({
                            "name": "glide_user_route",
                            "url": new URL(url).origin,
                            "secure": true,
                            "httpOnly": true,
                            "value": 'glide.' + node.nodeId
                        }, s => {
                            getActiveNode(jsnNodes);
                        });
                    });

                }

            });
        });
    }

}


function getActiveNode(jsn) {
    jsnNodes = jsn;
    chrome.cookies.get({
        "name": "glide_user_route",
        "url": new URL(url).origin
    }, cookie => {
        setDataTableNodes(jsnNodes, cookie.value.replace('glide.', ''));
    });
}


//Try to get json with instance nodes, first from chrome storage, else via REST api
async function prepareJsonNodes() {
    // Show spinner if not already shown by button click
    $('#waitingnodes').show();

    const dbMeta = await fetchDbMeta(url);
    const dbIconElement = document.getElementById('dbicon');
     if (dbIconElement) {
         dbIconElement.src = dbMeta.dbIcon;
         dbIconElement.alt = dbMeta.dbName !== 'N/A' ? `${dbMeta.dbName} icon` : 'Database icon';
         const toggleBtn = document.getElementById('toggleDbMetaBtn');
          if (toggleBtn) {
             toggleBtn.title = `Toggle DB Info\nName: ${dbMeta.dbName}\nURL: ${dbMeta.dbUrl}\nSession: ${dbMeta.sessionId || 'N/A'}`;
          }
     }

    const dbNameValueEl = document.getElementById('dbNameValue');
    const dbUrlValueEl = document.getElementById('dbUrlValue');
    const dbSessionValueEl = document.getElementById('dbSessionValue');

    if(dbNameValueEl) {
        const dbNameText = document.createTextNode(dbMeta.dbName ?? 'N/A');
        dbNameValueEl.textContent = '';
        dbNameValueEl.appendChild(dbNameText);
    }
    if(dbUrlValueEl) dbUrlValueEl.textContent = dbMeta.dbUrl ?? 'N/A';
    if(dbSessionValueEl) dbSessionValueEl.textContent = dbMeta.sessionId ?? 'N/A';    

    const dbAirportCodeEl = document.getElementById('dbAirportCode');
    if (dbAirportCodeEl) {
        let airportDisplayText = 'N/A';
        try {
            if (dbMeta.dbUrl && typeof dbMeta.dbUrl === 'string') {
                const match = dbMeta.dbUrl.match(/([a-zA-Z]{3})\d+\./);

                if (match && match[1]) {
                    const extractedCodeLower = match[1].toLowerCase(); // Extract and use lowercase

                    // Look up using the lowercase code
                    const airportInfo = airportCodes[extractedCodeLower];

                    // Format using new fields: city, country, region
                    if (airportInfo && airportInfo.city && airportInfo.country && airportInfo.region) {
                        // Format: CODE - City, Country (Region)
                        airportDisplayText = `${extractedCodeLower.toUpperCase()} - ${airportInfo.city}, ${airportInfo.country} (${airportInfo.region})`;
                    } else {
                         airportDisplayText = extractedCodeLower.toUpperCase(); // Fallback to uppercase code
                    }
                }
            }
        } catch (e) {
            console.error("Error processing airport code from dbUrl:", e);
            airportDisplayText = 'Error';
        }
        dbAirportCodeEl.textContent = airportDisplayText;
    }

    // Proceed with fetching and displaying node information
    var query = [instance + "-nodes", instance + "-nodes-date"];
    chrome.storage.local.get(query, function (result) {
        try {
            var thedate = new Date().toDateString();
            if (thedate == result[query[1]]?.toString()) { // Added safe navigation
                getActiveNode(result[query[0]]);
            }
            else{
                getNodes();
            }
        }
        catch (err) {
            console.error("Error processing stored nodes:", err);
            getNodes();
        }
    });
}


async function fetchDbMeta(url) {
    try {
        const response = await fetch(url + '/replication.do');
        if (!response.ok) {
            console.error("SNU: Failed to fetch replication.do:", response.status, response.statusText);
            return { dbName: 'N/A', dbUrl: 'N/A', dbIcon: 'images/database.png', sessionId: null };
        }
        const htmlText = await response.text();

        let sessionCookie = null;
        let sessionId = null;
        try {
            sessionCookie = await chrome.cookies.get({
                "name": "glide_session_store",
                "url": new URL(url).origin
            });
            if (sessionCookie) {
                console.log("SNU: Found session cookie:", sessionCookie);
                sessionId = sessionCookie.value;
            } else {
                console.warn("SNU: Session cookie 'glide_session_store' not found or permission denied.");
                if (chrome.runtime.lastError) {
                     console.error("SNU: chrome.cookies.get error:", chrome.runtime.lastError.message);
                }
            }
        } catch (cookieError) {
             console.error("SNU: Error calling chrome.cookies.get:", cookieError);
        }


        const parser = new DOMParser(); //parse the replication.do page
        const doc = parser.parseFromString(htmlText, 'text/html');

        const boldElements = doc.querySelectorAll('b');
        let dbName = 'Not found';
        let dbUrl = 'Not found';
        let dbIcon = 'images/database.png';

        for (let i = 0; i < boldElements.length; i++) {
            const el = boldElements[i];
            const nextText = el.nextSibling?.textContent?.trim().replace(/^:\s*/, '');
            if (el.textContent.trim() === 'Name' && nextText) {
                dbName = nextText;
            }
            if (el.textContent.trim() === 'URL' && nextText) {
                dbUrl = nextText;
                if (dbUrl.includes('postgresql')) {
                    dbIcon = 'images/raptor.png';
                    dbName = dbName + ' | <strong>RaptorDB</strong>';
                    document.querySelector('#dbmeta').classList.add('raptor');
                }
            }
        }

        return { dbName, dbUrl, dbIcon, sessionId };

    } catch (error) {
        console.error("SNU: Error fetching DB meta:", error);
        return { dbName: 'N/A', dbUrl: 'N/A', dbIcon: 'images/database.png', sessionId: 'N/A' };
    }
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href.toLowerCase();
    let srch = new URL(url).search;
    const params = new Proxy(new URLSearchParams(srch), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    return params[name];
}

//Set variables, called by BG page after calling getBrowserVariables
//Also attach event handlers.
function setBrowserVariables(obj) {

    document.querySelector('#notactive').style.display = 'none';
    //document.querySelector('#leavereview').style.display = '';

    let elms = document.querySelectorAll('[data-bs-toggle="disabledtab"]');
    elms.forEach(function(el) {
        el.setAttribute('data-bs-toggle', 'tab');
    });
    
    g_ck = obj.myVars.g_ck || '';
    url = obj.url;
    instance = (new URL(url)).host.replace(".service-now.com", "");
    userName = obj.myVars.NOWusername || obj.myVars.NOWuser_name;
    //roles = obj.myVars.NOWuserroles ;
    datetimeformat = obj.myVars.g_user_date_time_format;
    myFrameHref = obj.frameHref;
        
    setFormFromSyncStorage(function () {
        setTimeout(() => {
            let targetTab = document.getElementById('tbxactivetab').value;
            console.log((!targetTab && document.getElementById('cbxdbmetavisible').checked));
            if (!targetTab && document.getElementById('cbxdbmetavisible').checked) targetTab = "#tabnodes";
                $('.nav-tabs a[data-bs-target="' + targetTab + '"]').tab('show');
        }, 100);
    });

    //Attach eventlistners
    $('#btnGetUser').click(function () {
        getUserDetails(false);
    });
    //Attach eventlistners
    $('#btncreatefiles').click(function () {
        sendToSnuFileSync();
    });
    $('#tbxname').keypress(function (e) {
        if (e.which == '13') {
            e.preventDefault();
            getUserDetails(false);
        }
    });
    $('#btnrefreshtables').click(function () {
        $('#waitingtables').show();
        var dataset = document.querySelector('#slctdataset').value;
        getTables(dataset);
    });
    $('#slctdataset').on('change', function () {
        $('#waitingtables').show();
        var dataset = document.querySelector('#slctdataset').value;
        getTables(dataset);
    });

    $('.snu-setting').change(function () {
        saveSettings();
    });

    $('.snu-instance-setting').change(function () {
        setInstanceSettings();
    });

    $('input.snu-instance-setting').on('keyup',function () {
        setInstanceSettings();
    });


    $('#btnrefreshnodes').click(function () {
        $('#waitingnodes').show();
        getNodes();
    });

    // --- START: DB Info Toggle Logic ---
    const toggleButton = document.getElementById('toggleDbMetaBtn');
    const dbMetaContainer = document.getElementById('dbmeta');
    const dbMetaCheckbox = document.getElementById('cbxdbmetavisible');

    if (toggleButton && dbMetaContainer && dbMetaCheckbox) {
        // Set initial state based on saved preference in storage
        getFromSyncStorageGlobal("snusettings", function(settings) {
            if (settings && settings.hasOwnProperty('cbxdbmetavisible')) {
                dbMetaCheckbox.checked = settings.cbxdbmetavisible;
                dbMetaContainer.style.display = dbMetaCheckbox.checked ? 'block' : 'none';
            } else {
                dbMetaContainer.style.display = 'none';
                dbMetaCheckbox.checked = false;
            }
        });

        toggleButton.addEventListener('click', function(event) {
            event.preventDefault(); // Stop link behavior
            
            const newState = dbMetaContainer.style.display !== 'block';
            dbMetaContainer.style.display = newState ? 'block' : 'none';
            dbMetaCheckbox.checked = newState;
            
            saveSettings();
        });
    }
    // --- END: DB Info Toggle Logic ---

    $('input').on('blur', function () {
        setToChromeSyncStorage("formvalues", $('form .sync').serialize());
    });

    $('select').on('change', function () {
        setToChromeSyncStorage("formvalues", $('form .sync').serialize());
    });

    $('#btnSetGRName').click(function () {
        getGRQuery();
    });
    $('#tbxgrname').keypress(function (e) {
        if (e.which == '13') {
            e.preventDefault();
            getGRQuery();
        }
    });
    $('#tbxgrtemplate, #cbxtemplatelines, #cbxfullvarname').change(function (e) {
        getGRQuery();
    });

    $('a.popuplinks').click(function () {
        event.preventDefault();
        tabCreate({ "url": $(this).attr('href'), "active": !(event.ctrlKey || event.metaKey) });
    });

    $('#slashcommands, #slashsswitches').on('dblclick',function(){

        var extensionUrl = chrome.runtime.getURL("settingeditor.html");
        var createObj = {
            'url': extensionUrl + "?setting=" + this.id,
            'active': true
        }
        chrome.tabs.create(createObj);
       
    })

    $('#iconallowbadge').on('change',function(){
       iconSettingsDiv($(this).prop('checked'));
    })


    $.fn.dataTable.moment('DD-MM-YYYY HH:mm:ss');
    $.fn.dataTable.moment(datetimeformat);

    $('a[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
        
        var target = $(e.target).data("bsTarget"); // activated tab

        $('#tbxactivetab').val(target);
        setToChromeSyncStorage("formvalues", $('form .sync').serialize());

        switch (target) {
            case "#tabupdatesets":
                if (!updatesetsloaded) {
                    $('#waitingupdatesets').show();
                    getUpdateSets();
                    updatesetsloaded = true;
                }
                $('#tbxupdatesets').focus(function () {
                    $(this).select();
                });
                break;
            case "#tabupdates":
                if (!updatesloaded) {
                    $('#waitingupdates').show();
                    getUpdates();

                    updatesloaded = true;
                }
                $('#tbxupdates').focus(function () {
                    $(this).select();
                });
                break;
            case "#tabnodes":
                if (!nodesloaded) {
                    $('#waitingnodes').show();
                    prepareJsonNodes();
                    nodesloaded = true;
                }
                $('#tbxnodes').focus(function () {
                    $(this).select();
                });
                break;
            case "#tabtables":
                $('#tbxtables').focus(function () {
                    $(this).select();
                }).focus();
                if (!tablesloaded) {
                    $('#waitingtables').show();
                    prepareJsonTable();
                    tablesloaded = true;
                }

                break;
            case "#tabdataexplore":
                if (!dataexploreloaded) {
                    $('#waitingdataexplore').show();
                    getExploreData();
                    dataexploreloaded = true;
                }
                $('#tbxdataexplore').focus(function () {
                    $(this).select();
                });
                break;
            case "#tablink":
                $('#waitinglink').show();
                getRecordVariables();
                break;
            case "#tabgr":
                getGRQuery();
                break;
            case "#tabuser":
                if (!userloaded) {
                    if ($('#tbxname').val().length > 0)
                        getUserDetails(false);
                    userloaded = true;
                }
                $('#tbxname').focus(function () {
                    $(this).select();
                });
                break;
            case "#tabsettings":
                getSettings(function(){});
                getInstanceSettings();
                break;
            case "#tabslashcommands":
                getSlashcommands();
                setSampleCommandHref();
                break;
            case "#tabwhitelist":
                getSettings(function(){});
                break;
        }

    });

    $('#helperslashcommands').on('click', function () {
        $('#navslashcommands').click();
    })

    chrome.tabs.sendMessage(tabid, { method: "getSelection" }, function (selresponse) {
        var selectedText = ('' + selresponse.selectedText).trim();
        if (selectedText.length > 0 && selectedText.length <= 30)
            getUserDetails(selectedText);

    });

    document.querySelector('#btnopengrquery').addEventListener('click', evt => openGrInBgScript(!(evt.metaKey || evt.ctrlKey)));


}

//Query ServiceNow for updatsets, pass JSON back to popup
function getUpdateSets() {
    var myurl = url + '/api/now/ui/concoursepicker/updateset';
    snuFetch(g_ck, myurl, null, function (jsn) {
        setDataTableUpdateSets(jsn);
    });
}

//Set active updateset and refresh list on popup after it
function setUpdateSet(data) {
    var myurl = url + '/api/now/ui/concoursepicker/updateset';
    snuFetch(g_ck, myurl, data, function (jsn) {
        getUpdateSets();
    });
}

//Query ServiceNow for updaes by current user, pass JSON back to popup
function getUpdates() {
    var myurl = url + '/api/now/table/sys_update_xml?sysparm_display_value=true&sysparm_fields=sys_id%2Ctype%2Cname%2Ctarget_name%2Cupdate_set.name%2Csys_updated_on%2Csys_updated_by&sysparm_query=sys_updated_byLIKEjavascript:gs.getUserName()%5EORDERBYDESCsys_updated_on&sysparm_limit=20';
    snuFetch(g_ck, myurl, null, function (jsn) {
        setDataTableUpdates(jsn);
    });
}

//Set message, on about tab, callback from getInfoMessage
function setInfoMessage(html) {
    $('#livemessage').html(DOMPurify.sanitize(html));
}

function getSettings(callback) {
    getFromSyncStorageGlobal("snusettings", function (settings) {
        objSettings = settings || {};
        for (var setting in settings) {

            try {
            if (typeof settings[setting] == "boolean")
                document.getElementById(setting).checked = settings[setting];
            else
                document.getElementById(setting).value = settings[setting];
            }
            catch (ex) { //property removed
            }
        };
        iconSettingsDiv($('#iconallowbadge').prop('checked')); 
        callback();
    })
}

function saveSettings() {
    var snusettingsSync = {};
    var snusettings = {}
    $('.snu-setting').each(function (index, item) {
        if (this.type == 'checkbox') {
            snusettingsSync[this.id] = this.checked;
        }
        else {
            if (this.value.length < 5000) 
                snusettingsSync[this.id] = this.value;
            else { //overflow to local storage #204
                snusettingsSync[this.id] = '';
                snusettings[this.id] = this.value;
            }
        }

    });
    setToChromeSyncStorageGlobal("snusettings", snusettingsSync);
    setToChromeStorageGlobal("snusettings", snusettings);
    
}

function setInstanceSettings() {
    var snuinstancesettings = {};
    $('.snu-instance-setting').each(function (index, item) {
        snuinstancesettings[this.id] = this.value;
    });
    setToChromeSyncStorage("snuinstancesettings", snuinstancesettings);
    applyFavIconBadge(snuinstancesettings);
}

function getInstanceSettings() {

    getFromSyncStorage("snuinstancesettings", function(settings){
        objSettings = settings || {};
        for (var setting in settings) {

            if (typeof settings[setting] == "boolean")
                document.getElementById(setting).checked = settings[setting];
            else
                document.getElementById(setting).value = settings[setting];
        };
        applyFavIconBadge(settings);

    });
    $('#instancename').text(instance);
}

function iconSettingsDiv(visible){
    if (visible)
        $('#iconsettingsdiv').show();
    else 
        $('#iconsettingsdiv').hide();
}

function applyFavIconBadge(settings){
    document.getElementById("icontext").style.backgroundColor = settings?.iconcolorbg; 
    document.getElementById("icontext").style.color = settings?.iconcolortext; 
    chrome.tabs.sendMessage(tabid, { method: "setFavIconBadge", options: settings }, function () {});
}

function setSampleCommandHref() {
    
    var newHref = myFrameHref || urlFull;
    if ((newHref.split('?')[0]).indexOf('_list.do') > 1) {
        getListUrl();
    }
    else {
        if (newHref.includes('.do?')) //allow page with .do in url to default to the UI16 iframe
            newHref = newHref.replace(url + '/','');
        else 
            newHref = newHref.replace(url,'');
        setListUrl(newHref, '');
    }
}

function getListUrl() {

    chrome.tabs.sendMessage(tabid, {
        method: "getVars",
        myVars: "g_list.title,g_list.filter,g_list.tableName,g_list.fields,g_list.sortBy,g_list.sortDir"
    }, function (response) {
        var tableName = response.myVars.g_listtableName;
        var tableLabel = response.myVars.g_listtitle;
        var encQuery = response.myVars.g_listfilter;
        var orderBy = response.myVars.g_listsortBy;
        var fields = response.myVars.g_listfields.split(',').slice(0, 2).join(',');
        var isDesc = response.myVars.g_listsortDir == "DESC" ? "DESC" : "";
        if (orderBy)
            encQuery += `^ORDERBY${isDesc}${orderBy}`;
        var listUrl = `${tableName}_list.do?sysparm_query=${encQuery}`;
        setListUrl(listUrl, tableLabel, fields);
    });
}

function setListUrl(listUrl, tableLabel, fields){
    var hrf = document.getElementById('cmdforma');
    hrf.href = url + '/' + listUrl
    hrf.innerText =listUrl;
    hrf.setAttribute('data-tablelabel', tableLabel);

    hrf.onclick = function(e) { 
        e.preventDefault();
        document.getElementById('tbxslashurl').value = this.innerText;
        if (tableLabel)
            document.getElementById('tbxslashhint').value = this.getAttribute('data-tablelabel') + ' <search>';
        document.getElementById('tbxslashcmd').value = '';
        document.getElementById('tbxslashfields').value = fields;
        document.getElementById('tbxslashcmd').focus();
        slashCommandShowFieldField();
    };

}

function getGRQueryList(varName, template, templatelines, fullvarname) {

    chrome.tabs.sendMessage(tabid, {
        method: "getVars",
        myVars: "g_list.filter,g_list.tableName,g_list.sortBy,g_list.sortDir,g_list.rowsPerPage,g_list.fields"
    }, function (response) {
        var tableName = response.myVars.g_listtableName;
        if (!tableName) { //dealing with a table that ends with _list, like sys_ui_list
            getGRQueryForm(varName, template, templatelines, fullvarname);
            return;
        }

        varName = varName || grVarName(tableName, fullvarname);
        var encQuery = response.myVars.g_listfilter;
        var orderBy = response.myVars.g_listsortBy;
        var isDesc = (response.myVars.g_listsortDir == "DESC");
        var fields = ('' + response.myVars.g_listfields).split(',');
        var rowsPerPage = response.myVars.g_listrowsPerPage;
        var queryStr = "var " + varName + " = new GlideRecord('" + tableName + "');\n";
        queryStr += varName + ".addEncodedQuery(\"" + encQuery.replaceAll('"', '\\"') + "\");\n";
        if (isDesc)
            queryStr += varName + ".orderByDesc('" + orderBy + "');\n";
        else
            queryStr += varName + ".orderBy('" + orderBy + "');\n";
        queryStr += varName + ".setLimit(" + rowsPerPage + ");\n";
        queryStr += varName + ".query();\n";
        queryStr += "while (" + varName + ".next()) {\n";
        if (templatelines) {
            queryStr += "    //" + varName + ".initialize();\n";
        }
        if (template) {
            for (var i = 0; i < fields.length; i++) {
                queryStr += "    " + template.replace(/\{0\}/g, varName).replace(/\{1\}/g, fields[i]) + "\n";
            }
        } else
            queryStr += "\n\n    //todo: code ;)\n\n";
        if (templatelines) {

            queryStr += "    //" + varName + ".autoSysFields(false);\n";
            queryStr += "    //" + varName + ".setWorkflow(false);\n";
            queryStr += "    //" + varName + ".update();\n";
            queryStr += "    //" + varName + ".insert();\n";
            queryStr += "    //" + varName + ".deleteRecord();\n";
        }
        queryStr += "}";

        setGRQuery(queryStr);
    });
}

function getGRQueryForm(varName, template, templatelines, fullvarname) {

    chrome.tabs.sendMessage(tabid, {
        method: "getVars",
        myVars: "g_form.tableName,NOW.sysId,mySysId,elNames"
    }, function (response) {
        var tableName = response.myVars.g_formtableName;
        var sysId = response.myVars.NOWsysId || response.myVars.mySysId;
        if (!tableName) { //try to find table and sys_id in workspace
            var myurl = new URL(response.frameHref)
            var parts = myurl.pathname.split("/");
            var idx = parts.indexOf("sub") // show subrecord if available
            if (idx != -1) parts = parts.slice(idx);
            idx = parts.indexOf("record")
            if (idx > -1 && parts.length >= idx + 2) {
                tableName = parts[idx + 1];
                sysId = parts[idx + 2];
            }
        }
        
        varName = varName || grVarName(tableName, fullvarname);
        var fields = ('' + response.myVars.elNames).split(',');
        var queryStr = "var " + varName + " = new GlideRecord('" + tableName + "');\n";
        queryStr += "if (" + varName + ".get('" + sysId + "')) {\n";
        if (templatelines) {
            queryStr += "    //" + varName + ".initialize();\n";
        }
        if (template) {
            for (var i = 0; i < fields.length; i++) {
                queryStr += "    " + template.replace(/\{0\}/g, varName).replace(/\{1\}/g, fields[i]) + "\n";
            }
        } else
            queryStr += "\n\n    //todo: code ;)\n\n";
        if (templatelines) {
            queryStr += "    //" + varName + ".autoSysFields(false);\n";
            queryStr += "    //" + varName + ".setWorkflow(false);\n";
            queryStr += "    //" + varName + ".update();\n";
            queryStr += "    //" + varName + ".insert();\n";
            queryStr += "    //" + varName + ".deleteRecord();\n";
        }
        queryStr += "}";

        setGRQuery(queryStr);
    });

}


function getGRQuery() {

    var newHref = myFrameHref || urlFull;
    if ((newHref.split('?')[0]).indexOf('_list.do') > 1) {
        getGRQueryList($('#tbxgrname').val(), $('#tbxgrtemplate').val(),
            document.getElementById('cbxtemplatelines').checked,
            document.getElementById('cbxfullvarname').checked);
    }
    else {
        getGRQueryForm($('#tbxgrname').val(), $('#tbxgrtemplate').val(),
            document.getElementById('cbxtemplatelines').checked,
            document.getElementById('cbxfullvarname').checked);
    }
}

function grVarName(tableName, fullvarname) {
    grVar = ('' + tableName).replace(/[-_]([a-z])/g, function (g) {
        return g[1].toUpperCase();
    });

    var varName = grVar.charAt(0).toUpperCase() + grVar.slice(1);
    if (varName.length >= 10 && !fullvarname)
        varName = varName.replace(/[a-z]/g, '');
    return 'gr' + varName;
}

function setGRQuery(gr) {
    if (gr.indexOf("GlideRecord('undefined')") > -1) gr = "This only works in forms and lists.";
    $('#txtgrquery').val(gr).select();
}

//Initiate Call to servicenow rest api
function getUserDetails(userName) {
    if (!userName) userName = $('#tbxname').val();
    $('#tbxname').val(userName);
    $('#waitinguser').show();

    var myurl = url + "/api/now/table/sys_user?sysparm_display_value=all&sysparm_query=user_name%3D" + userName;
    snuFetch(g_ck, myurl, null, function (fetchResult) {
        var listhyperlink = " <a target='_blank' href='" + url + "/sys_user_list.do?sysparm_query=user_nameLIKE" + userName + "%5EORnameLIKE" + userName + "'> <i class='fa fa-list' aria-hidden='true'></i></a>";
        var html;
        if (fetchResult.result.length > 0) {
            var usr = fetchResult.result[0];
            html = "<br /><table class='table table-condensed table-bordered table-striped'>" +
                "<tr><th>User details</th><th>" + usr.user_name.display_value + listhyperlink + "</th></tr>" +

                "<tr><td>Name:</td><td><a href='" + url + "/nav_to.do?uri=sys_user.do?sys_id=" +
                usr.sys_id.display_value + "' target='_user'>" +
                usr.name.display_value + "</a></td></tr>" +
                "<tr><td>Active:</td><td>" + usr.active.display_value + "</td></tr>" +
                "<tr><td>Last login:</td><td>" + usr.last_login_time.display_value + "</td></tr>" +
                "<tr><td>Created:</td><td>" + usr.sys_created_on.display_value + "</td></tr>" +
                "<tr><td>Created by:</td><td>" + usr.sys_created_by.display_value + " <a id='createdby' data-username='" + usr.sys_created_by.display_value + "' href='#'> <i class='fa fa-sign-out fa-1' aria-hidden='true'></i></a></td></tr>" +
                "<tr><td>Phone:</td><td>" + usr.phone.display_value + "</td></tr>" +
                "<tr><td>E-mail:</td><td><a href='mailto:" + usr.email.display_value + "'>" + usr.email.display_value + "</a></td></tr></table>";
            setUserDetails(html);
        } else {
            html = "<br /><table class='table table-condensed table-bordered table-striped'><tr><th>User details</th><th>" + userName + listhyperlink + "</th></tr>" +
                "<tr><td>Result:</td><td>No exact match, try clicking the list icon.</td></tr></table>";
            setUserDetails(html);
        }
    });
}


//Set the user details table
function setUserDetails(html) {
    $('#rspns').html(DOMPurify.sanitize(html));

    if ($('#createdby').length > 0) {
        $('.nav-tabs a[data-bs-target="#tabuser"]').tab('show');
        $('#createdby').click(function () {
            var usr = $(this).data('username');
            $('#tbxname').val(usr).focus(function () {
                $(this).select();
            });

            getUserDetails(usr);
        });
    }
    else
        $('#tbxname').val('');

    $('#waitinguser').hide();
}

//set or refresh datatable with ServiceNow updatesets
function setDataTableUpdateSets(nme) {

    if (nme == 'error') {
        $('#updatesets').hide().after('<br /><div class="alert alert-danger">Data can not be retrieved, are you an Admin?</div>');
        $('#waitingupdatesets').hide();
        return false;
    }

    $('#btnnewupdateset').attr('href', url + '/nav_to.do?uri=%2Fsys_update_set.do%3Fsys_id%3D');
    $('#btnopenupdatesets').attr('href', url + '/nav_to.do?uri=%2Fsys_update_set_list.do?sysparm_query=state%3Din%20progress');

    if (dtUpdateSets) dtUpdateSets.destroy();
    dtUpdateSets = $('#updatesets').DataTable({
        "aaData": nme.result.updateSet,
        "aoColumns": [
            { "mDataProp": "name" },
            {
                mRender: function (data, type, row) {
                    var iscurrent = "";
                    if (row.sysId == nme.result.current.sysId) iscurrent = "iscurrent";
                    return "<a class='updatesetlist' href='" + url + "/nav_to.do?uri=sys_update_set.do?sys_id=" + row.sysId + "' title='Table definition' ><i class='fas fa-list' aria-hidden='true'></i></a> " +
                        "<a class='setcurrent " + iscurrent + "' data-post='{name: \"" + row.name + "\", sysId: \"" + row.sysId + "\"}' href='#" + row.sysId + "' title='Set current updateset'><i class='far fa-dot-circle' aria-hidden='true'></i></a> ";
                },
                "width": "7%",
                "searchable": false
            }
        ],
        "drawCallback": function () {
            var row0 = $("#updatesets tbody tr a.iscurrent").closest('tr');
            $('#updatesets tbody tr:first').before(row0.css('background-color', '#86ED78'));
        },
        "language": {
            "info": "Matched: _TOTAL_ of _MAX_ updatesets | Hold down CMD or CTRL to keep window open after clicking a link",
            "infoFiltered": "",
            "infoEmpty": "No matches found"
        },
        "bLengthChange": false,
        "bSortClasses": false,
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false

    });

    $('#tbxupdatesets').keyup(function () {
        dtUpdateSets.search($(this).val(),true).draw();
    }).focus().trigger('keyup');

    $('a.updatesetlist').click(function () {
        event.preventDefault();
        tabCreate({ "url": $(this).attr('href'), "active": !(event.ctrlKey || event.metaKey) });
    });

    $('a.setcurrent').click(function () {
        $('#waitingupdatesets').show();
        setUpdateSet($(this).data('post'));
    });

    $('#waitingupdatesets').hide();

}


function setNodes(jsn) {

    if (typeof jsn == "undefined" || jsn == "error") {
        $('#instancenodes').hide().after('<br /><div class="alert alert-danger">Nodes data can not be retrieved, are you an Admin?</div>');
        $('#waitingnodes').hide();
        return false;
    }

    setToChromeStorage("nodes", jsn);
    getActiveNode(jsn);
}

//set or refresh datatable with ServiceNow updatesets
function setDataTableNodes(nme, node) {


    if (dtNodes) dtNodes.destroy();
    dtNodes = $('#instancenodes').DataTable({
        "aaData": nme,
        "aoColumns": [
            {
                mRender: function (data, type, row) {
                    return row.system_id.split(":")[1];
                }
            },
            { "mDataProp": "system_id" },
            { "mDataProp": "status" },
            { "mDataProp": "node_type" },
            {
                mRender: function (data, type, row) {
                    var iscurrent = (row.node_id == node);
                    return "<a class='setnode " + (iscurrent ? "iscurrent" : "") + "' data-node='" + row.system_id + "' href='#' id='" + row.node_id + "' title='Switch to Node'><i class='far fa-dot-circle' aria-hidden='true'></i>" + (iscurrent ? " Active Node" : " Set Active") + "</a> ";
                },
                "searchable": false
            }
        ],
        "bLengthChange": false,
        "bSortClasses": false,
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false

    });

    $('#tbxnodes').keyup(function () {
        dtNodes.search($(this).val(),true).draw();
    }).focus().trigger('keyup');

    $('a.setnode').click(function (ev) {

        ev.currentTarget.textContent = '';
        const spinner = document.createElement('i');
        spinner.className = 'fas fa-spinner fa-spin';
        spinner.style.color = 'blue';
        spinner.style.important = true;
        ev.currentTarget.appendChild(spinner);
        ev.currentTarget.appendChild(document.createTextNode(' Switching...'));
        ev.currentTarget.style.color = "blue";
        console.log(ev);
        var node = {"nodeId" : this.id, "nodeName" : $(this).attr('data-node') };
        setActiveNode(node)



    });

    $('#waitingnodes').hide();

}

//set or refresh datatable with ServiceNow tables
function setDataTableUpdates(nme) {

    if (nme == 'error') {
        $('#updts').hide().after('<br /><div class="alert alert-danger">Data can not be retrieved, are you an Admin?</div>');
        $('#waitingupdates').hide();
        return false;
    }

    if (dtUpdates) dtUpdates.destroy();

    dtUpdates = $('#updts').DataTable({
        "aaData": nme.result,
        "aoColumns": [
            { "mDataProp": "type" },
            { "mDataProp": "target_name" },
            { "mDataProp": "sys_updated_on" },
            { "mDataProp": "update_set\\.name" },
            {
                mRender: function (data, type, row) {
                    var i = row.name.lastIndexOf("_");
                    return "<a class='updatetarget' href='" + url + "/" + row.name.substr(0, i) + ".do?sys_id=" + row.name.substr(i + 1) + "' title='Open related record' ><i class='fas fa-edit' aria-hidden='true'></i></a> " +
                        "<a class='updatetarget' href='" + url + "/sys_update_xml.do?sys_id=" + row.sys_id + "' title='View update' ><i class='fas fa-history' aria-hidden='true'></i></a> ";
                },
                "width": "7%",
                "searchable": false
            }
        ],
        "language": {
            "info": "Matched: _TOTAL_ of _MAX_ updates | Hold down CMD or CTRL to keep window open after clicking a link",
            "infoFiltered": "",
            "infoEmpty": "No matches found"
        },
        "bLengthChange": false,
        "bSortClasses": false,
        "scrollY": "200px",
        "scrollCollapse": true,
        "order": [[2, "desc"]],
        "paging": false

    });


    $('a.updatetarget').click(function () {
        event.preventDefault();
        tabCreate({ "url": $(this).attr('href'), "active": !(event.ctrlKey || event.metaKey) });
    });

    $('#tbxupdates').keyup(function () {
        dtUpdates.search($(this).val(),true).draw();
    }).focus().trigger('keyup');


    $('#waitingupdates').hide();
}


//Query ServiceNow for tables, pass JSON back to popup
function getTables(dataset) {

    var fields = 'name,label';
    var query = 'sys_update_nameISNOTEMPTY^nameNOT LIKElog00^nameNOT LIKEevent00%5EORDERBYlabel';

    if (dataset == 'advanced') {
        fields = 'name,label,super_class.name,sys_scope.scope';
    }
    else
        if (dataset == 'customtables') {
            fields = 'name,label,super_class.name,sys_scope.scope';
            var query =
                "nameSTARTSWITHu_^ORnameSTARTSWITHx_^nameNOT LIKE_cmdb^super_class.name!=scheduled_data_import^super_class.name!=sys_portal_page" +
                "^super_class.name!=cmn_location^super_class.name!=sf_state_flow^super_class.name!=sys_report_import_table_parent" +
                "^super_class.name!=cmn_schedule_condition^super_class.name!=sys_auth_profile^super_class.name!=sys_transform_script" +
                "^super_class.name!=dl_definition^super_class.name!=sys_dictionary^super_class.name!=sys_transform_map" +
                "^super_class.name!=dl_matcher^super_class.name!=sys_filter^super_class.name!=sys_user_preference" +
                "^super_class.name!=kb_knowledge^super_class.name!=sys_hub_action_type_base^super_class.name!=sysauto sc_cat_item_delivery_task" +
                "^super_class.name!=sys_import_set_row^super_class.name!=syslog^NQnameSTARTSWITHu_^ORnameSTARTSWITHx_^super_classISEMPTY" +
                "^sys_update_nameISNOTEMPTY^nameNOT LIKElog00^nameNOT LIKEevent00%5EORDERBYlabel";
        }


    var myurl = url + '/api/now/table/sys_db_object?sysparm_fields=' + fields + '&sysparm_query=' + query;
    snuFetch(g_ck, myurl, null, function (jsn) {
        if (jsn?.error){
            document.querySelector('#divtblinfo').innerText = jsn?.status + ' - ' + jsn.error?.detail;
            document.querySelector('#divtblinfo').classList = 'alert alert-danger';
            $('#waitingtables').hide();
        }
        else {
            var res = JSON.stringify(jsn?.result).
                replace(/super_class.name/g, 'super_classname').
                replace(/sys_scope.scope/g, 'sys_scopescope'); //hack to get rid of . in object key names
            setTables(JSON.parse(res));
        }
    });
}

//add object to storage and refresh datatable
function setTables(jsn) {
    var dataset = document.querySelector('#slctdataset').value;
    setToChromeStorage("tables-" + dataset, jsn);
    setDataTableTables(jsn);
}



//set or refresh datatable with ServiceNow tables
function setDataTableTables(nme) {

    if (dtTables) {
        dtTables.destroy();
        $('#tbls thead tr .dyna').remove();
        $('#tbls tbody tr').remove();
    }

    var columnDefs = [
        { "width": "46%", "targets": 0 },
        { "width": "46%", "targets": 1 },
        { "width": "8%", "targets": 2 }
    ];

    var aoColumns = [
        { "mDataProp": "label" },
        { "mDataProp": "name" },
        {
            mRender: function (data, type, row) {
                return "<a class='tabletargetlist' href='" + url + '/' + row.name + "_list.do' title='Go to List (Using query selected below)' ><i class='fas fa-table' aria-hidden='true'></i></a> " +
                    "<a class='tabletarget' href='" + url + "/nav_to.do?uri=sys_db_object.do?sys_id=" + row.name + "%26sysparm_refkey=name' title='Go to table definition' ><i class='fas fa-cog' aria-hidden='true'></i></a> " +
                    "<a class='tabletarget' href='" + url + "/generic_hierarchy_erd.do?sysparm_attributes=table_history=,table=" + row.name + ",show_internal=true,show_referenced=true,show_referenced_by=true,show_extended=true,show_extended_by=true,table_expansion=,spacing_x=60,spacing_y=90,nocontext' title='Show Schema Map'><i class='fas fa-sitemap' aria-hidden='true'></i></a>";
            },
            "searchable": false
        }
    ]

    if (nme.length) {
        if (nme[0].hasOwnProperty("super_classname")) {
            aoColumns.splice(2, 0, { "mDataProp": "super_classname" });
            aoColumns.splice(3, 0, { "mDataProp": "sys_scopescope" });
            $('th#thaction').after('<th class="dyna">Extends</th><th class="dyna">Scope</th>');

            var columnDefs = [
                { "width": "25%", "targets": 0 },
                { "width": "24%", "targets": 1 },
                { "width": "24%", "targets": 2 },
                { "width": "18%", "targets": 3 },
                { "width": "9%", "targets": 4 }
            ];

        }
    }

    dtTables = $('#tbls').DataTable({
        "aaData": nme,
        "columnDefs": columnDefs,
        "aoColumns": aoColumns,
        "bAutoWidth": false,
        "language": {
            "info": "Matched: _TOTAL_ of _MAX_ tables, showing max 250 | Hold down CMD or CTRL to keep window open after clicking a link ",
            "infoFiltered": "",
            "infoEmpty": "No matches found"
        },
        "bLengthChange": false,
        "bSortClasses": false,
        "scrollY": "200px",
        "scrollCollapse": true,
        "pageLength": 250,
        //"paging": false,
        "dom": 'rti<"btns"B>',
        "buttons": [
            "copyHtml5"
        ]

    });

    dtTables.on('draw.dt', function () {
        $('a.tabletargetlist:not(.evented)').click(function () {
            event.preventDefault();
            var url = $(this).attr('href') + "?sysparm_query=" + $('#slctlistquery').val();
            if (url.indexOf("syslog") > 1) {
                url = url.replace(/sys_updated_on/g, 'sys_created_on'); //syslog tables have no updated columnn.
            }
            tabCreate({ "url": url, "active": !(event.ctrlKey || event.metaKey) });
        }).addClass('evented');

        $('a.tabletarget:not(.evented)').click(function () {
            event.preventDefault();
            tabCreate({ "url": $(this).attr('href'), "active": !(event.ctrlKey || event.metaKey) });
        }).addClass('evented');
    });


    $('#tbxtables').keyup(function () {
        dtTables.search($(this).val(),true).draw();
    }).focus().trigger('keyup');


    $('#waitingtables').hide();
}

var dataslashcommands;
function getSlashcommands() {

    getSettings(function () { //sorry for throwing this in callback, not a star in async stuff :(

        dataslashcommands = Object.keys(snuslashcommands).map(function (key) {
            var source = "2builtin";
            var url = snuslashcommands[key].url;
            var fields = snuslashcommands[key].fields;
            var order = snuslashcommands[key].order;
            var overwriteurl = snuslashcommands[key].overwriteurl;
            if (url.startsWith('*')) {
                source = "3script";
                url = 'Built in scripted command, cannot be overwritten';
            };
            return { "command": key, "url": url, "hint": snuEncodeHtml(snuslashcommands[key].hint), "fields": fields, "overwriteurl" : overwriteurl,  "source": source, "order" : order  };
        });

        try {
            objCustomCommands = JSON.parse(objSettings.slashcommands);
        } catch (e) { };

        // Check if there are custom commands and show warning if there are
        const warningEl = document.getElementById('warningBackup');
        if (warningEl && objCustomCommands && Object.keys(objCustomCommands).length > 0) {
            warningEl.style.display = 'block';
        } else if (warningEl) {
            warningEl.style.display = 'none';
        }

        Object.keys(objCustomCommands).forEach(function (key) {
            dataslashcommands.push({ "command": key, "url": objCustomCommands[key].url, "hint": snuEncodeHtml(objCustomCommands[key].hint), "fields": objCustomCommands[key].fields, "overwriteurl" : objCustomCommands[key].overwriteurl, "order" : objCustomCommands[key].order,  "source": "1custom" });
        });


        if (dtSlashcommands) dtSlashcommands.destroy();
        dtSlashcommands = $('#tblslashcommands').DataTable({
            "aaData": dataslashcommands,
            "aoColumns": [
                {
                    mRender: function (data, type, row) {
                        var icon = '<span class="hidden">' + row.source + '</span><i title="Built in command" class="fas fa-chevron-circle-right"></i>';
                        if (row.source == '1custom') icon = '<span class="hidden">' + row.source + '</span><i title="Custom command" class="fas fa-user-circle"></i>';
                        if (row.source == '3script') {
                            icon = '<span class="hidden">' + row.source + '</span><i title="Built in read-only" class="fas fa-stop-circle"></i>';
                        };
                        return "<div>" + icon + "</div>";
                    },
                    "width": "3%",
                    "bSearchable": true,
                    "mDataProp": "source"

                },
                { "mDataProp": "command" },
                {
                    mRender: function (data, type, row) {
                        return "<div>" + row.hint + "</div><div class='snucmdurl'>" + row.url.replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#39;','"':'&quot;'}[tag] || tag)); + "</div>";
                    }
                },
                {
                    mRender: function (data, type, row) {

                        var html = ''
                        if (row.source == "1custom" || row.source == "2builtin") {
                            html += "<a href='#'><i class='fas fa-edit' aria-hidden='true'></i></a> "
                        }
                        if (row.source == "1custom") {
                            html += "<a class='deletecmd' href='#' data-cmd='"+ row.command +"' ><i class='far fa-trash-alt ' aria-hidden='true'></i></a>"
                        }
                        html += `<div class='snucmdurl'>${(row.order || 100)}</div>`;
                        return html;
                    },
                    "width": "10%",
                    "searchable": false,
                    "mDataProp": "order"
                }

            ],
            "language": {
                "info": "Matched: _TOTAL_ of _MAX_ slashcommands <a id='downloadcommands' href='javavscript:'>Backup custom slashcommands</a>",
                "infoFiltered": "",
                "infoEmpty": "No matches found"
            },
            "rowCallback": function (row, data) {

                if (data.source != '3script') {

                    $(row).on('click', function (e) {
                        $('#divslashmsg').text('');
                        var row = dtSlashcommands.row(this).data();
                        $('#tbxslashcmd').val(row.command);
                        $('#tbxslashurl').val(row.url);
                        $('#tbxslashhint').val(snuDecodeHtml(row.hint));
                        $('#tbxslashfields').val(snuDecodeHtml(row.fields));
                        $('#tbxslashorder').val(snuDecodeHtml(row.order));
                        $('#tbxslashoverwriteurl').val(snuDecodeHtml(row.overwriteurl));
                        $('#cmdformhelpprefill').hide();
                        slashCommandShowFieldField();
                    });

                }

            },
            "bLengthChange": false,
            "bSortClasses": false,
            "scrollY": "200px",
            "scrollCollapse": true,
            "paging": false

        });

        $('#tbxslashcommands').keyup(function () {
            dtSlashcommands.search($(this).val(),true).draw();
        }).focus().trigger('keyup');

        $('a.deletecmd').on('click', function (e) {

            event.preventDefault();
            var cmd = $(this).data('cmd');
            if (!confirm("Delete command " + cmd + "?")) return;
            delete objCustomCommands[cmd];
            $('#slashcommands').val(JSON.stringify(objCustomCommands));
            saveSettings();
            getSlashcommands();
        
        });

        $('#tbxslashurl').on('change', function (e) {
            slashCommandShowFieldField();
        });

        
        if (JSON.stringify(objCustomCommands).length > 2){
            $('#downloadcommands').on('click', downloadCommands).show();
            // Add click handler to the backup link that calls the same download function
            $('#backupCmdsLink').on('click', function(e) {
                e.preventDefault();
                downloadCommands();
            });
        }
        else {
            $('#downloadcommands').hide();
        }

        $('button#btnsaveslashcommand').click(function () {

            event.preventDefault();
            $('#divslashmsg').text('');
            var cmds = {};
            try {
                cmds = JSON.parse($('#slashcommands').val());
            } catch (e) { };
            var cmdname = $('#tbxslashcmd').val().replace(/[^a-zA-Z0-9_-]/gi, '').toLowerCase();
            if (!cmdname){
                $('#divslashmsg').text('No command name defined');
                return;
            }
            cmds[cmdname] = {
                "url": $('#tbxslashurl').val(),
                "hint": $('#tbxslashhint').val(),
                "fields" : $('#tbxslashfields').val(),
                "order" : Number($('#tbxslashorder').val()),
                "overwriteurl" : $('#tbxslashoverwriteurl').val()
            };
            $('#slashcommands').val(JSON.stringify(cmds));

            objSettings.slashcommands = cmds;

            //send the update command direct to the browser, without need for reload
            var details = {
                "action" : "updateSlashCommand",
                "cmdname" : cmdname,
                "cmd" : cmds[cmdname]
            }
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { 
                    "method" : "snuProcessEvent", 
                    "detail" : details }, 
                response => { });
            });

            saveSettings();
            getSlashcommands();

            chrome.runtime.sendMessage({ "event" : "initializecontextmenus"});

            // Show the warning after saving a command
            const warningEl = document.getElementById('warningBackup');
            if (warningEl) {
                warningEl.style.display = 'block';
            }
        });
    });
}
function getShortcuts() {
    console.log("getShortcuts");

    const jsonData = [
        { "shortcut": "Ctrl + C", "command": "/copy" },
        { "shortcut": "Ctrl + V", "command": "/paste" },
        { "shortcut": "Ctrl + X", "command": "/cut" },
        { "shortcut": "Ctrl + Z", "command": "/undo" },
        { "shortcut": "Ctrl + Y", "command": "/redo" }
    ];

    // Initialize DataTable with JSON data
    $('#shrtcuts').DataTable({
        data: jsonData, // Use the JSON data here
        columns: [
            { data: 'shortcut', title: 'Shortcut' }, // Define the column data source
            { data: 'command', title: 'Slash Command' } // Define the column data source
        ],
        paging: true,
        searching: true,
        ordering: true,
        info: true
    });

}
// getShortcuts();


function getTableSysId(){ //extracted from inject.js snuResolveVariables, todo:merge methods
    var ts = {
        tableName : '',
        sysId : ''
    }
    const loc = new URL(urlFull);
    //console.log(loc);
    if (loc.pathname == "/sys_report_template.do"){ //report
        let searchParams = new URLSearchParams(loc.search);
        ts.tableName = 'sys_report';
        ts.sysId =(searchParams.get('jvar_report_id') || '').replace(/[^a-f0-9-_]/g, '');
    }
    else if (loc.pathname == "/$flow-designer.do"){ //flowdesigner
        if (loc.hash.startsWith("#/flow-designer/")){
            ts.tableName = "sys_hub_flow";
            ts.sysId = loc.hash.replace("#/flow-designer/","").substring(0,32);
        }
        else if (loc.hash.startsWith("#/sub-flow-designer/")){
            ts.tableName = "sys_hub_flow";
            ts.sysId = loc.hash.replace("#/sub-flow-designer/","").substring(0,32);
        }
        else if (loc.hash.startsWith("#/action-designer/")){
            ts.tableName = "sys_hub_action_type_definition";
            ts.sysId = loc.hash.replace("#/action-designer/","").substring(0,32);
        }
    }
    else { ///get sysid and tablename from portal or workspace
        let searchParams = new URLSearchParams(loc.search)
        ts.tableName = searchParams.get('table') || searchParams.get('id');
        ts.sysId = searchParams.get('sys_id');
        if (!(ts.tableName && ts.sysId)) { //workspace
            var parts = loc.pathname.split("/");
            var idx = parts.indexOf("sub") // show subrecord if available
            if (idx != -1) parts = parts.slice(idx);
            idx = parts.indexOf("record")
            if (idx > -1 && parts.length >= idx + 2) {
                ts.tableName = parts[idx + 1];
                ts.sysId = parts[idx + 2];
            }
        }
    }
    console.log(ts);

    return ts;
}

//Query ServiceNow for tables, pass JSON back to popup
function getExploreData() {

    chrome.tabs.sendMessage(tabid, {
        method: "getVars",
        myVars: "g_form.tableName,NOW.sysId,mySysId,elNames"
    }, function (response) {
        var tableName = response.myVars.g_formtableName || getParameterByName("table", response.frameHref) || getParameterByName('id', response.frameHref) || getTableSysId().tableName ;
        var sysId = response.myVars.NOWsysId || response.myVars.mySysId || getParameterByName("sys_id", response.frameHref) || getTableSysId().sysId;

        if (!tableName) { //try to find table and sys_id in workspace
            var myurl = new URL(response.frameHref)
            var parts = myurl.pathname.split("/");
            var idx = parts.indexOf("sub") // show subrecord if available
            if (idx != -1) parts = parts.slice(idx);
            idx = parts.indexOf("record")
            if (idx > -1 && parts.length >= idx + 2) {
                tableName = parts[idx + 1];
                sysId = parts[idx + 2];
            }
        }

        if (!(tableName && sysId)) {
            setDataExplore([]);
            return true;
        }

        var myurl = url + '/api/now/ui/meta/' + tableName;
        snuFetch(g_ck, myurl, null, function (metaData) {
            var query = '';
            if (sysId)
                query = '&sysparm_query=sys_id%3D' + sysId;
            var myurl = url + '/api/now/table/' + tableName + '?sysparm_display_value=all&sysparm_limit=1' + query;
            snuFetch(g_ck, myurl, null, function (jsn) {

                var dataExplore = [];
                var propObj = {};
                propObj.name = "#TABLE / SYS_ID";
                propObj.meta = {
                    "label": "#TABLE / SYS_ID",
                    "type": "TABLE"
                };
                propObj.display_value = "<a class='referencelink' href='" + url + "/" + tableName + ".do?sys_id=" + sysId + "' target='_blank'>" + tableName + " / " + sysId + "</a>";
                propObj.link = url + "/" + tableName + ".do?sys_id=" + sysId;
                propObj.value = tableName + " / " + sysId;
                dataExplore.push(propObj);

                var rows = {}

                try {
                    rows = jsn.result[0];
                } catch (e) {
                    rows = { "Error": { "display_value": e.message, "value": "Record data not retrieved." } };
                }

                for (var key in rows) {
                    var propObj = {};
                    if (!rows.hasOwnProperty(key)) continue;

                    var display_value = rows[key].display_value;
                    var link = propObj.link = rows[key].link;
                    if (link) {
                        var linksplit = link.split('/');
                        var href = url + '/' + linksplit[6] + '.do?sys_id=' + linksplit[7];
                        if (!display_value) display_value = '[Deleted reference or empty display value]';
                        display_value = "<a href='" + href + "' target='_blank'>" + display_value + "</a>";
                    }

                    propObj.name = key;
                    propObj.meta = (metaData && metaData != "error") ? metaData.result.columns[key] : { "label": "Error" };
                    propObj.display_value = display_value;
                    propObj.value = (display_value != rows[key].value) ? rows[key].value : '';


                    dataExplore.push(propObj);
                }
                document.querySelector('#vdnewtab').addEventListener('click', () => { viewData(tableName, sysId) });
                setDataExplore(dataExplore);
            });
        });
    });

}

//set or refresh datatable with ServiceNow tables
function setDataExplore(nme) {

    Object.entries(nme).forEach( // add check of empty fields to be able to filter out
        ([key, obj]) => {
            nme[key].hasdata = (obj.value || obj.display_value) ? "hasdata" : "";
            if (!nme[key].link ) {
                let escpd = escape(nme[key].display_value);
                if (nme[key].display_value != escpd)
                    nme[key].display_value = '<pre style="white-space: pre-wrap; max-width:300px;"><code>' + escpd + '</code></pre>'
            }
        }
    );
    
    if (dtDataExplore) dtTables.destroy();
       //$('#dataexplore').html(DOMPurify.sanitize(nme));
    dtDataExplore = $('#dataexplore').DataTable({
        "aaData": nme,
        "aoColumns": [

            { "mDataProp": "meta.label" },
            { "mDataProp": "name" },
            {
                mRender: function (data, type, row) {
                    var reference = "<div class='refname'>" + row?.meta?.reference + "</div>";
                    if (reference.includes('undefined')) reference = '';
                    return row?.meta?.type + reference;
                },

                "bSearchable": true,
                "mDataProp": "meta.type"

            },
            { "mDataProp": "value" },
            { "mDataProp": "display_value" },
            { "mDataProp": "hasdata" }
        ],
        "language": {
            "info": "Matched: _TOTAL_ of _MAX_ fields | Hold down CMD or CTRL to keep window open after clicking a link",
            "infoFiltered": "",
            "infoEmpty": "No matches found"
        },
        "bLengthChange": false,
        "bSortClasses": false,
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false,
        "dom": 'rti<"btns"B>',
        "buttons": [
            "copyHtml5",
            {
                text: 'Toggle Type',
                action: function (e, dt, node, config) {
                    var vis = !dtDataExplore.column(2).visible();
                    dtDataExplore.column(2).visible(vis);

                }
            }
        ]

    });
    
    dtDataExplore.column(5).visible(false);

    $('#tbxdataexplore').keyup(function () {
        var srch = ($('#cbxhideempty').prop('checked') ? "hasdata " : "") + $('#tbxdataexplore').val();
        dtDataExplore.search(srch,true).draw();
    }).focus().trigger('keyup');

    
    $('#cbxhideempty').change(function (e) {
        var srch = ($('#cbxhideempty').prop('checked') ? "hasdata " : "") + $('#tbxdataexplore').val();
        dtDataExplore.search(srch,true).draw();
    });

    $('a.referencelink').click(function () {
        event.preventDefault();
        tabCreate({ "url": $(this).attr('href'), "active": !(event.ctrlKey || event.metaKey) });
    });

    $('#waitingdataexplore').hide();

}

function slashCommandShowFieldField(){
    if ($('#tbxslashurl').val().includes('sysparm_query=')){
        $('.showfields').show();

    }
    else{
        $('.showfields').hide();
    }       
}

function downloadCommands() {
    var text = document.getElementById('slashcommands').value;
    if (text.length < 5){
        alert("No custom commands found");
        return;
    } 
    var text = JSON.stringify(JSON.parse(text),4,4);
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', "slashcommands.json.txt");
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }


//Place the key value pair in the chrome local storage, with metafield for date added.
function setToChromeStorage(theName, theValue) {
    var myobj = {};
    myobj[instance + "-" + theName] = theValue;
    myobj[instance + "-" + theName + "-date"] = new Date().toDateString();
    chrome.storage.local.set(myobj, function () {

    });
}

function setToChromeSyncStorage(theName, theValue) {
    var myobj = {};
    myobj[instance + "-" + theName] = theValue;
    chrome.storage.sync.set(myobj, function () {
    });
}

//get an instance sync parameter
function getFromSyncStorage(theName, callback) {
    chrome.storage.sync.get(instance + "-" + theName, function (result) {
        callback(result[instance + "-" + theName]);
    });
}

//set an instance independent sync parameter
function setToChromeSyncStorageGlobal(theName, theValue) {
    var myobj = {};
    myobj[theName] = theValue;
    chrome.storage.sync.set(myobj, function () {

    });
}

//set an instance independent parameter
function setToChromeStorageGlobal(theName, theValue) {
    console.log(theName, theValue)
    var myobj = {};
    myobj[theName] = theValue;
    chrome.storage.local.set(myobj, function () {
    });
}

//get an instance independent global parameter
function getFromChromeStorageGlobal(theName, callback) {
    chrome.storage.local.get(theName, function (result) {
        callback(result[theName]);
    });
}
    
//get an instance independent sync parameter
function getFromSyncStorageGlobal(theName, callback) {
    chrome.storage.sync.get(theName, function (resSync) {
        var dataSync = resSync[theName];

        if (typeof dataSync !== 'object'){ //only objects can become large and merged.
            callback(dataSync);
            return;
        }

        getFromChromeStorageGlobal(theName,function (resLocal) {
            var objLocal = resLocal || {};
            var objMerged = { ...dataSync, ...objLocal};
            callback(objMerged);
        });
    });
}


// Function to query Servicenow API
// To work with Firefox containers, this is routed via the content page Issue #415
function snuFetch(token, url, post, callback) {
    let options = {
        token : token,
        url : url,
        post : post
    }
    chrome.tabs.sendMessage(tabid, { method: "snuFetch", options: options }, function (resp) {
        callback(resp);
    });

}

// Create a new browser tab via the content page
// To work with Firefox containers, this is adding the cookiestoreid the content page Issue #415
function tabCreate(createObj) {
    if (cookieStoreId) createObj.cookieStoreId = cookieStoreId;
    if (tabIndex > -1) createObj.index = tabIndex+1;
    chrome.tabs.create(createObj);
}

function viewData(tableName,sysId) {
    var extensionUrl = chrome.runtime.getURL("viewdata.html");
    var args = '?tablename=' + tableName +
        '&sysid=' + sysId +
        '&instance=' + instance +
        '&url=' + url +
        '&g_ck=' + g_ck;

    var createObj = {
        'url': extensionUrl + args,
        'active': false
    }
    if (cookieStoreId) createObj.cookieStoreId = cookieStoreId; //only FireFox
    if (tabIndex > -1) createObj.index = tabIndex+1;
    chrome.tabs.create(createObj);
}


function openGrInBgScript(active) {
    let content = encodeURIComponent(document.getElementById('txtgrquery').value);
    let createObj = {
        'url': url + "/sys.scripts.do?content=" + content,
        'active': active,
    }
    if (tabIndex > -1) createObj.index = tabIndex+1;
    if (cookieStoreId) createObj.cookieStoreId = cookieStoreId;
    chrome.tabs.create(createObj);
}

function escape(htmlStr) {
    if (!htmlStr) return '';
    return htmlStr.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");        
 
 }


function requestPermissionsForCurrentSite() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var currentTab = tabs[0];
        if (currentTab && currentTab.url) {
            var url = new URL(currentTab.url);
            var host = url.hostname;

            // Build the permissions object for host permissions
            var permissions = {
                origins: [`*://${host}/*`]
            };

            // Request permissions
            chrome.permissions.request(permissions, function(granted) {
                if (granted) {
                    console.log(`Permissions granted for ${host}`);
                    // Extension can now interact with the granted site
                } else {
                    console.log('Permissions not granted.');
                }
            });
        }
    });
}

async function getStatsDoInfo() {
    try {
        const res = await fetch(url + '/stats.do');
        const text = await res.text();
        const match = text.match(/Build tag:\s*(.+?)</i);
        return match ? match[1].trim() : 'Unknown';
    } catch {
        return 'Unavailable';
    }
}

const infoIcon = document.getElementById('issue-template-icon');
const modal = document.getElementById('issue-template-modal');
const modalClose = document.getElementById('close-issue-template-modal');
const modalCopy = document.getElementById('modal-copy-issue-template');
const modalContent = document.getElementById('modal-issue-template-content');

function showIssueTemplateModal() {
  modal.style.display = 'flex';
  buildIssueTemplate().then(template => {
    modalContent.textContent = template;
  });
}
function hideIssueTemplateModal() {
  modal.style.display = 'none';
  modalContent.textContent = '';
}
if (infoIcon && modal) {
  infoIcon.addEventListener('click', showIssueTemplateModal);
}
if (modalClose) {
  modalClose.addEventListener('click', hideIssueTemplateModal);
}
if (modal) {
  modal.addEventListener('click', function(e) {
    if (e.target === modal) hideIssueTemplateModal();
  });
}
if (modalCopy && modalContent) {
  modalCopy.addEventListener('click', function() {
    const text = modalContent.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      modalCopy.textContent = 'Copied!';
      setTimeout(() => { modalCopy.textContent = 'Copy'; }, 1200);
    });
  });
}
// Update buildIssueTemplate to return the template string
async function buildIssueTemplate() {
  const ua = navigator.userAgent;
  const browser = ua.includes('Chrome') ? 'Chrome' : 'Other';
  const extensionVersion = chrome.runtime.getManifest().short_name + " - " + chrome.runtime.getManifest().version;
  const snVersion = await getStatsDoInfo();
  return `### Description\n<!-- Clearly describe the issue, include steps to reproduce and screenshots if possible -->\n\n### Environment details\n- **User agent:** ${browser} (${ua})\n- **SN Utils Extension Version:** ${extensionVersion}\n- **ServiceNow Version:** ${snVersion}`;
}

setTimeout(() => {
  const infoIcon = document.getElementById('issue-template-icon');
  const modal = document.getElementById('issue-template-modal');
  const modalClose = document.getElementById('close-issue-template-modal');
  const modalCopy = document.getElementById('modal-copy-issue-template');
  const modalContent = document.getElementById('modal-issue-template-content');

  function showIssueTemplateModal() {
    modal.style.display = 'flex';
    buildIssueTemplate().then(template => {
      modalContent.textContent = template;
    });
  }
  function hideIssueTemplateModal() {
    modal.style.display = 'none';
    modalContent.textContent = '';
  }
  if (infoIcon && modal) {
    infoIcon.addEventListener('click', showIssueTemplateModal);
  }
  if (modalClose) {
    modalClose.addEventListener('click', hideIssueTemplateModal);
  }
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) hideIssueTemplateModal();
    });
  }
  if (modalCopy && modalContent) {
    modalCopy.addEventListener('click', function() {
      const text = modalContent.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        modalCopy.textContent = 'Copied!';
        setTimeout(() => { modalCopy.textContent = 'Copy'; }, 1200);
      });
    });
  }
},1000);

// Update buildIssueTemplate to return the template string
async function buildIssueTemplate() {
  const ua = navigator.userAgent;
  const browser = ua.includes('Chrome') ? 'Chrome' : 'Other';
  const extensionVersion = chrome.runtime.getManifest().short_name + " - " + chrome.runtime.getManifest().version;
  const snVersion = await getStatsDoInfo();
  return `### Description\n<!-- Clearly describe the issue, include steps to reproduce and screenshots if possible -->\n\n### Environment details\n- **User agent:** ${browser} (${ua})\n- **SN Utils Extension Version:** ${extensionVersion}\n- **ServiceNow Version:** ${snVersion}`;
}

// Utility to show a toast message
function showChangelogToast(msg) {
    const toast = document.getElementById('changelog-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 6000);
}