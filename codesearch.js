var tableIndex = 0;
var statisticsObj;
var searchTables = [];
var defaultTables = [
  'sys_script', 'sys_ui_action', 'sys_trigger', 'sys_ui_page', 'sys_ui_script', 'sys_processor',
  'sys_script_include', 'sys_ui_policy', 'sys_script_client', 'sys_ui_macro', 'process_step_approval',
  'sysevent_in_email_action', 'sys_ui_style', 'sys_installation_exit', 'sys_script_validator',
  'sysauto_script', 'sys_relationship', 'sys_script_ajax', 'sys_transform_script', 'sysevent_email_action',
  'ecc_agent_script_include', 'sys_security_acl', 'cmn_map_page', 'wf_activity_definition', 'kb_navons',
  'sys_transform_map', 'content_block_programmatic', 'sysevent_email_template', 'bsm_action',
  'sys_widgets', 'sysevent_script_action'
];

var suggestedtables = [
  //tablename,fields,condition
  ['bsm_action', 'name,script', 'active=true'],
  ['cmn_map_page', 'name,script', ''],
  ['content_block_programmatic', 'name,programmitc_content', 'active=true'],
  ['ecc_agent_script_include', 'name,script', 'active=true'],
  ['kb_navons', 'name,script', 'active=true'],
  ['metric_definition', 'name,script', 'active=true'],
  ['process_step_approval', 'name,approver_script', ''],
  [
    'sc_cat_item_producer',
    'delivery_plan_script,entitlement_script,post_insert_script,script',
    'active=true'
  ],
  ['sp_angular_provider', 'script', ''],
  [
    'sp_search_source',
    'data_fetch_script,facet_generation_script,search_page_template,typeahead_template',
    ''
  ],
  ['sp_widget', 'template,script,client_script,link', ''],
  ['sysauto_script', 'name,script,condition', 'active=true'],
  [
    'sysevent_email_action',
    'name,advanced_condition,message,sms_alternate',
    'active=true'
  ],
  [
    'sysevent_email_template',
    'name,message,message_html,sms_alternate,subject',
    ''
  ],
  [
    'sysevent_in_email_action',
    'name,script,filter_conditions,condition_script',
    'active=true'
  ],
  [
    'sysevent_script_action',
    'name,script,condition_script,event_name',
    'active=true'
  ],
  ['sys_app_quota', 'query', ''],
  [
    'sys_dictionary',
    'dynamic_ref_qual,reference_qual,attributes,default_value,calculation',
    'active=true^use_dynamic_default=false'
  ],
  [
    'sys_dictionary_override',
    'reference_qual,attributes,default_value,calculation',
    ''
  ],
  ['sys_filter_option_dynamic', 'script_reference_id,script', 'active=true'],
  ['sys_installation_exit', 'name,script', 'active=true'],
  ['sys_processor', 'name,script,description,path,class_name', 'active=true'],
  ['sys_properties', 'name,choices,value', ''],
  ['sys_relationship', 'name,apply_to,query_from,query_with', ''],
  ['sys_script', 'name,script,condition,filter_condition', 'active=true'],
  ['sys_script_ajax', 'name,script', 'active=true'],
  ['sys_script_client', 'name,script', 'active=true'],
  ['sys_script_email', 'script', ''],
  ['sys_script_fix', 'name,script', 'active=true'],
  ['sys_script_include', 'name,script', 'active=true'],
  ['sys_script_validator', 'validator', ''],
  ['sys_security_acl', 'name,script,condition', 'active=true'],
  ['sys_transform_entry', 'source_script', ''],
  ['sys_transform_map', 'name,script', 'active=true'],
  ['sys_transform_script', 'script', 'active=true'],
  ['sys_trigger', 'name,script,job_context', ''],
  ['sys_ui_action', 'name,script,condition,onclick', 'active=true'],
  [
    'sys_ui_context_menu',
    'action_script,condition,on_show_script',
    'active=true'
  ],
  [
    'sys_ui_list_control',
    'columns_condition,edit_condition,empty_condition,filter_condition,link_condition,new_condition',
    ''
  ],
  ['sys_ui_macro', 'name,xml', 'active=true'],
  ['sys_ui_page', 'name,client_script,html,processing_script', ''],
  [
    'sys_ui_policy',
    'short_description,script_false,script_true,conditions',
    'active=true'
  ],
  ['sys_ui_script', 'name,script', 'active=true'],
  ['sys_variable_value', 'value', ''],
  ['sys_web_service', 'script', 'active=true'],
  ['sys_widgets', 'name,script', 'active=true'],
  ['sys_ws_operation', 'operation_script', 'active=true'],
  ['wf_activity_definition', 'name,script', ''],
  ['sys_rte_eb_script_operation', 'script,conditional_script', '']
];

var missingtables = [];
var searchGroups = [];
//dummy data so it doesnt brake :)
var selectedGroup = {
  sys_id: 'c2f8a6a2d7120200b6bddb0c825203cd'
};

var header = document.getElementById('fixheader');
var sticky = 30; //header.offsetTop;

/**
 * getSearchGroup so you can choose the search group
 * is sn_codesearch.Studio Search Group
 */
function getSearchGroups(url, g_ck) {
  var endpoint = `${url}/api/now/table/sn_codesearch_search_group`;
  loadXMLDoc(g_ck, endpoint, null).then((results) => {
    results.result.forEach(function (group) {
      const groupObj = {
        sys_id: group.sys_id,
        name: group.name,
        description: group.description
      };

      if (group.name === 'sn_codesearch.Studio Search Group') {
        selectedGroup = groupObj;
        searchGroups.unshift(groupObj);
      } else {
        searchGroups.push(groupObj);
      }
    });

    searchGroups.forEach((group) => {
      $('#search_group_select').append(
        $('<option>', {
          value: group.sys_id,
          text: group.name
        })
      );
    });

    $('#search_group_select').val(`${selectedGroup.sys_id}`).change();
  });
}

function getGroupTables() {
  var url = getUrlVars('url');
  var g_ck = getUrlVars('g_ck');
  var query = getUrlVars('query');

  if (!$('#select_default_tables_checkbox').is(':checked')) {
    searchTables = [];
  } else {
    searchTables = [...defaultTables];
  }

  jQuery('#hreftables').attr(
    'href',
    `${url}/sn_codesearch_table_list.do?sysparm_query=search_group%3D${selectedGroup.sys_id}`
  );

  var endpoint = `${url}/api/now/table/sn_codesearch_table?sysparm_query=search_group=${selectedGroup.sys_id}&sysparm_display_value=false&sysparm_fields=table`;

  loadXMLDoc(g_ck, endpoint, null).then((results) => {
    var actualtablesarray = [];
    results.result.forEach((res) => {
      if (!searchTables.includes(res.table)) searchTables.unshift(res.table);
      actualtablesarray.push(res.table);
    });

    suggestedtables.forEach((tbl) => {
      if (!actualtablesarray.includes(tbl[0])) {
        var lnk = `${url}/sn_codesearch_table.do?sys_id=-1&sysparm_query=search_group=9a44f352d7120200b6bddb0c82520376^table=` +
        `${tbl[0]}^search_fields=${tbl[1]}^additional_filter=${tbl[2]}`;
        tbl.push(lnk);
        missingtables.push(tbl);
      }
    });

    if (query) executeCodeSearch(url, g_ck, query);
  });
}

(function initialize(url, g_ck, query) {
  window.onscroll = function () {
    scrolling();
  };

  if (getUrlVars('g_ck')) {
    jQuery('#query').val(getUrlVars('query'));
    jQuery('#spnInstance').text(getUrlVars('instance'));
    //
    document.title = getUrlVars('instance') + ' - Codesearch';
    var url = getUrlVars('url');
    var g_ck = getUrlVars('g_ck');
    var query = getUrlVars('query');

    getSearchGroups(url, g_ck, query);
    // getGroupTables()
  }

  jQuery('#hrefgroups').attr(
    'href',
    `${url}/sn_codesearch_search_group_list.do`
  );


  //handlers for search
  jQuery('#btnSearch').on('click', doSearch);
  jQuery('input#query').on('keyup', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  });

  jQuery('input#search_group').on('keyup', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch();
    }
  });

  $('#search_group_select').on('change', function (e) {
    const sys_id = $('#search_group_select').val();
    setDefaultGroubBySysId(sys_id);
    getGroupTables();
    missingTablesVisible(sys_id);
  });

  $('#select_default_tables_checkbox').click(function (e) {
    getGroupTables();
  });
})();

function doSearch() {
  executeCodeSearch(
    getUrlVars('url'),
    getUrlVars('g_ck'),
    jQuery('#query').val(),
    jQuery('#search_group').val()
  );
}


function missingTablesVisible(sys_id) {
  if (sys_id == 'c2f8a6a2d7120200b6bddb0c825203cd')
    $('#missingtables').show();
  else
    $('#missingtables').hide();
}

function renderResults(url, result, searchTerm, tables) {
  var resultHtml = generateHtmlForCodeSearchEntry(
    result.result,
    url,
    searchTerm,
    statisticsObj
  );
  if (tableIndex == 0) jQuery('#searchcontent').html(DOMPurify.sanitize(''));
  jQuery('#searchcontent').append(DOMPurify.sanitize(resultHtml, { ADD_ATTR: ['target'] }));
  jQuery('#searchmsgtablelinks').html(DOMPurify.sanitize(statisticsObj.tableNames || '', { ADD_ATTR: ['target'] }));
}

function generateHtmlForCodeSearchEntry(data, url, searchTerm, statisticsObj) {
  if (!data || !data.hits || data.hits.length == 0) {
    return '';
  }

  var header =
    // '<div class="card"> <a class="anchor" name="'+ data.recordType+'"></a>' +
    // '<div class="card-header" id="head_' + data.recordType + '">' +
    // '<h5 class="mb-0"><button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_' + data.recordType + '" aria-expanded="true" aria-controls="collapse_' + data.recordType + '">' +
    // data.tableLabel + ' [' + data.recordType + '] (' + data.hits.length + ')' + '</button>' +
    // '</h5></div>' +
    // '<div id="collapse_' + data.recordType + '" class="collapse show" aria-labelledby="' + data.recordType + '" idata-bs-parent="#searchCodeAccordion">' +
    // '<div class="card-body">';<i class="fas fa-chevron-circle-down"></i>
    `<div class="card"> <a class="anchor" name="${data.recordType}"></a>
    <div class="card-header" id="head_${data.recordType}">
    <h5 class="mb-0"><button class="btn btn-link" type="button" data-bs-toggle="collapse" 
    data-bs-target="#collapse_${data.recordType}" aria-expanded="true" aria-controls="collapse_${data.recordType}">
    <i class="fas fa-chevron-circle-right"></i></button>${data.tableLabel}' [${data.recordType}] | Hits:${data.hits.length}</h5></div>
    <div id="collapse_${data.recordType}" class="tablecollapse collapse show" aria-labelledby="${data.recordType}" 
    idata-bs-parent="#searchCodeAccordion"><div class="card-body">`;

  var footer =
    `</div> <!--card-body-->
    </div> <!--collapse-->
    </div> <!--card--><br />`;

  statisticsObj.tables += 1;
  statisticsObj.tableNames += `<a href='#${data.recordType}'>${data.tableLabel}</a>`;

  var tableAccordion = `<div class="accordion" id="searchCodeTableAccordion_${data.recordType}">`;

  jQuery.each(data.hits, function (idx, hit) {
    var recordHeader = `
      <div class="card">
      <div class="card-header" id="head_${hit.sysId}">
      <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${hit.sysId}" 
      aria-expanded="true" aria-controls="collapse_${hit.sysId}"><i class="fas fa-chevron-circle-right"></i></button>
      <span class="bigger"><a href="${url}/${data.recordType}.do?sys_id=${hit.sysId}" target="_blank">
      ${(hit.name || '(empty)').replace(/<\/?[^>]+(>|$)/g, "")} (${hit.matches.length})</a></span></div>
      <div id="collapse_${hit.sysId}" class="collapse show" aria-labelledby="${hit.sysId}" 
      idata-bs-parent="#searchCodeTableAccordion_${data.recordType}"><div class="card-body">`;

    var text = `<ul class="record">`;
    statisticsObj.hits += 1;

    jQuery.each(hit.matches, function (indx, match) {
      text += `<li><span>Field:${match.fieldLabel}</span><pre><code>`;
      jQuery.each(match.lineMatches, function (ix, fieldMatch) {
        statisticsObj.lines += 1;
        var fieldMatchHighlighted = fieldMatch.escaped.replace(
          new RegExp(escapeSearchRegex(searchTerm), 'gi'),
          function (m) {
            return `<strong>${m}</strong>`;
          }
        );
        text += `${fieldMatch.line} | ${fieldMatchHighlighted} \n`;
      });
      text += `</code></pre></li>`;
    });
    text += `</ul>`;

    var recordFooter =
      `</div> <!--card-body-->
      </div> <!--collapse-->
      </div> <!--card-->`;

    tableAccordion += recordHeader + text + recordFooter;
  });

  tableAccordion += `</div>`;

  var rtrn = header + tableAccordion + footer;
  return rtrn;
}

function executeCodeSearch(url, gck, searchTerm, searchGroup) {
  if (searchTerm.length < 3) {
    jQuery('#searchmsg').html('Searchterm must be 3 characters or more');
    return;
  }

  var urlParms = new URLSearchParams();
  urlParms.append('term', searchTerm);
  urlParms.append('limit', 500);
  urlParms.append('search_all_scopes', 'true');
  urlParms.append('search_group', selectedGroup.name);

  var endpoint = `${url}/api/sn_codesearch/code_search/search?${urlParms.toString()}`;

  function searchLocation(idx) {
    if (idx == 0) {
      jQuery('#searchcontent').html('');
      statisticsObj = {
        tables: 0,
        hits: 0,
        lines: 0,
        tableNames: ''
      };
    }

    jQuery('#searchmsg').html('Searching table: ' + DOMPurify.sanitize(searchTables[idx]) + '...');

    //console.log(endpoint + '&table=' + searchTables[idx]);
    loadXMLDoc(gck, endpoint + '&table=' + searchTables[idx], null).then(
      (results) => {
        renderResults(url, results, searchTerm, searchTables);

        if (tableIndex + 1 < searchTables.length) {
          tableIndex++;
          searchLocation(tableIndex);
        } else {
          tableIndex = 0;

          var html =
            `Result of last search: <u>${jQuery('#query').val()}</u> | Tables: <u>${statisticsObj.tables}</u> | Records: <u>
            ${statisticsObj.hits} </u> | Hits: <u>${statisticsObj.lines}</u>`;
          jQuery('#searchmsg').html(DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }));

          if (missingtables.length > 0) {
            statisticsObj.tableNames +=
              `<a class='whitebg' href='#suggestedtables'>${missingtables.length} suggested tables</a>`;
            jQuery('#searchmsgtablelinks').html(DOMPurify.sanitize(statisticsObj.tableNames || '', { ADD_ATTR: ['target'] }));

            var missingTablesHtml =
              `<div class='card-body'><a class='anchor' name='suggestedtables'></a>Consider adding the following tables to code search. (Credit: <a href='https://jace.pro' target='_blank'>Jace Benson</a>)<br />
              Click link to open prefilled record. Note this will be tracked in current scope / update set<br /><br /><ul>`;
            missingtables.forEach((tbl) => {
              missingTablesHtml += `<li><a href='${tbl[3]}' target='tbls'>${tbl[0]}</a></li>`;
            });
            missingTablesHtml += `</ul></div>`;
            jQuery('#missingtables').html(DOMPurify.sanitize(missingTablesHtml, { ADD_ATTR: ['target'] }));
          }
        }
      }
    );
  }

  searchLocation(tableIndex);
}

function loadXMLDoc(token, url, post) {
  let hdrs = {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*'
  };

  if (token) hdrs['X-UserToken'] = token;

  let requestInfo = {
      method : 'get',
      headers : hdrs
  }

  if (post){
      requestInfo.method = 'PUT';
      requestInfo.body = post;
  }

  return new Promise(function (resolve, reject) {
    fetch(url, requestInfo)
    .then(response => response.json())
    .then(data => { 
      resolve(data);
    })
    .catch(error => {
      reject(error);
    });
  });
}

function getUrlVars(key) {
  var vars = {};
  var parts = window.location.href.replace(
    /[?&]+([^=&]+)=([^&]*)/gi,
    function (m, key, value) {
      vars[key] = decodeURIComponent(value);
    }
  );
  return vars[key];
}

function scrolling() {
  if (window.pageYOffset > sticky) {
    header.classList.add('sticky');
  } else {
    header.classList.remove('sticky');
  }
}

function setDefaultGroubBySysId(sys_id) {
  searchGroups.forEach((group) => {
    if (group.sys_id == sys_id) {
      selectedGroup = group;
      setGroupDescription(selectedGroup);
      return;
    }
  });
}

function setGroupDescription(group) {
  $('#search_group_description').text(group.description);
}

function escapeSearchRegex(search_term) {
  search_term = htmlEntities(search_term);
  if (RegExp.escape) {
    // use browser-provided regex escape function, if available
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape
    search_term = RegExp.escape(search_term);
  } else {
    // otherwise, manually escape special characters
    search_term = search_term.replace(/(\\|\(|\)|\[\]|\.)/g, m => '\\'+m);
  }
  return search_term;
}

function htmlEntities(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}



/*

snippet to do search for multiple words, problem with this is search includes a genereic term like GlideRecord 

let searchTerm = 'fred googlep'
let s = [...new Set(searchTerm.toLowerCase().split(' '))].filter((n) => n.length > 1).reduce(
  (unique, item) => ( unique.filter(e => item.includes(item)).length > 1 ? unique : [...unique, item]),[],);

let res = {
    result : [],
    sysIds : [],
    uniqueSysIds : []
};



let sysIds = []
for ( i = 0; i < s.length; i++){

    res.result[i] = await loadXMLDoc(getUrlVars('g_ck'),"https://empakooi.service-now.com/api/sn_codesearch/code_search/search?term=" + s[i] 
    +"&limit=100&search_all_scopes=true&search_group=sn_devstudio.Studio+Search+Group&table=sys_script_include");

    res.sysIds[i] = res.result[i].result.hits.map(a => a.sysId)
    
    if (i == 0 )
        res.uniqueSysIds = res.sysIds[i];
    else 
        res.uniqueSysIds = res.uniqueSysIds.filter(element => res.sysIds[i].includes(element));
    

}
res.uniqueSysIds

*/
