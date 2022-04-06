/*! 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

var config = {};
var files = [];

async function loadConfig() {
  config = await jQuery.get('config.json');
  console.log(config);
}

async function loadFiles() {
  files = await jQuery.get(config.API_URL + 'list-files');
  console.log(files);

  $('#files-list').empty();
  $('#spinner').remove();

  files.forEach((file, index) => {
    var row = `
        <tr>
        <th scope="row">`+ file.Key + `</th>
        <td>`+ formatBytes(file.Size) + `</td>
        <td>`+ file.StorageClass + `</td>`;

    if (file.status == 'retrieving') {
      row += `<td><button class="btn btn-primary" type="button" disabled>
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span class="sr-only">Retrieving...</span>
            </button></td>`;
    } else if (file.status == 'archived') {
      row += `<td><button type="button" class="btn btn-primary btn-retrieve" data-id="` + index + `">Retrieve file</button></td>`
    } else if (file.status == 'available') {
      row += `<td><button type="button" class="btn btn-success btn-download" data-id="` + index + `">Download</button></td>`
    }
    row += `</tr>`

    $('#files-list').append(row);
  });

  $(".btn-retrieve").click(function (event) {
    let file_id = $(event.target).attr('data-id');
    let file = files[file_id];
    $("#retrieval_modal #header").html(file.Key + ' (' + formatBytes(file.Size) + ')');
    $("#retrieval_modal #file").val(file.Key);
    $("#retrieval_modal").modal('show');
  });

  $(".btn-download").click(function (event) {
    let file = files[$(event.target).attr('data-id')];
    window.open(config.API_URL + 'download?' + new URLSearchParams({ fileKey: file.Key }).toString());
  });

  $(".btn-retrieve-submit").click(function (event) {
    $.ajax(config.API_URL + 'initiate-retrieval', {
      data: JSON.stringify({
        'fileKey': $("#retrieval_modal #file").val(),
        'requester': $("#retrieval_modal #email").val(),
        'requestedForDays': parseInt($("#retrieval_modal #duration").val()),
        'objectRetrievalTier': $('#tier_standard:checked').val() == 'on' ? 'Standard' : 'Bulk'
      }),
      contentType: 'application/json',
      type: 'POST',
      success: function (data) {
        $("#retrieval_modal").modal('hide');
        loadFiles();
      },
      error: function (jqXHR, textStatus, errorThrown) {

      }
    });
  });
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function init() {
  await loadConfig();
  loadFiles();
}

$(function () {
  init();
});