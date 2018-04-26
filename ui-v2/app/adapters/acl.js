import Adapter, {
  REQUEST_CREATE,
  REQUEST_READ,
  REQUEST_UPDATE,
  REQUEST_DELETE,
  DATACENTER_KEY as API_DATACENTER_KEY,
} from './application';
import { PRIMARY_KEY, SLUG_KEY } from 'consul-ui/models/acl';
import { FOREIGN_KEY as DATACENTER_KEY } from 'consul-ui/models/dc';
import { PUT as HTTP_PUT } from 'consul-ui/utils/http/method';
import { OK as HTTP_OK } from 'consul-ui/utils/http/status';

import makeAttrable from 'consul-ui/utils/makeAttrable';

export default Adapter.extend({
  urlForQuery: function(query, modelName) {
    // https://www.consul.io/api/acl.html#list-acls
    return this.appendURL('acl/list', [], this.cleanQuery(query));
  },
  urlForQueryRecord: function(query, modelName) {
    // https://www.consul.io/api/acl.html#read-acl-token
    return this.appendURL('acl/info', [query.id], this.cleanQuery(query));
  },
  urlForCreateRecord: function(modelName, snapshot) {
    // https://www.consul.io/api/acl.html#create-acl-token
    return this.appendURL('acl/create', [], {
      [API_DATACENTER_KEY]: snapshot.attr(DATACENTER_KEY),
    });
  },
  urlForUpdateRecord: function(id, modelName, snapshot) {
    // the id is in the payload, don't add it in here
    // https://www.consul.io/api/acl.html#update-acl-token
    return this.appendURL('acl/update', [], {
      [API_DATACENTER_KEY]: snapshot.attr(DATACENTER_KEY),
    });
  },
  urlForDeleteRecord: function(id, modelName, snapshot) {
    // https://www.consul.io/api/acl.html#delete-acl-token
    return this.appendURL('acl/destroy', [snapshot.attr(SLUG_KEY)], {
      [API_DATACENTER_KEY]: snapshot.attr(DATACENTER_KEY),
    });
  },
  urlForCloneRecord: function(modelName, snapshot) {
    // https://www.consul.io/api/acl.html#clone-acl-token
    return this.appendURL('acl/clone', [snapshot.attr(SLUG_KEY)], {
      [API_DATACENTER_KEY]: snapshot.attr(DATACENTER_KEY),
    });
  },
  dataForRequest: function(params) {
    const data = this._super(...arguments);
    switch (params.requestType) {
      case REQUEST_UPDATE:
      case REQUEST_CREATE:
        return data.acl;
    }
    return data;
  },
  methodForRequest: function(params) {
    switch (params.requestType) {
      case REQUEST_DELETE:
      case REQUEST_CREATE:
        return HTTP_PUT;
      case REQUEST_READ:
        if (params.query.clone) {
          return HTTP_PUT;
        }
    }
    return this._super(...arguments);
  },
  isCreateRecord: function(url) {
    return (
      url.pathname ===
      this.parseURL(this.urlForCreateRecord('acl', makeAttrable({ [DATACENTER_KEY]: '' }))).pathname
    );
  },
  handleResponse: function(status, headers, payload, requestData) {
    let response = payload;
    if (status === HTTP_OK) {
      const url = this.parseURL(requestData.url);
      switch (true) {
        case response === true:
          response = {
            [PRIMARY_KEY]: this.uidForURL(url),
          };
          break;
        case this.isCreateRecord(url):
          response = {
            ...response,
            ...{
              [PRIMARY_KEY]: this.uidForURL(url, response[SLUG_KEY]),
            },
          };
          break;
        case this.isQueryRecord(url):
          response = {
            ...response[0],
            ...{
              [PRIMARY_KEY]: this.uidForURL(url),
            },
          };
          break;
        default:
          response = response.map((item, i, arr) => {
            return {
              ...item,
              ...{
                [PRIMARY_KEY]: this.uidForURL(url, item[SLUG_KEY]),
              },
            };
          });
      }
    }
    return this._super(status, headers, response, requestData);
  },
});
