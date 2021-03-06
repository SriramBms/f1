/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Raindrop.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * */

/*jslint indent: 2 */
/*global define: false, window: false, location: true, localStorage: false,
  opener: false, setTimeout: false, navigator: false */

'use strict';

define([ 'blade/object', 'storage'],
function (object,         storage) {

  var newHotness = parseFloat(navigator.userAgent.split('Firefox/')[1]) >= 4,
      store = storage(),
      svcs, prop;

  function SvcBase(name, options) {
    if (!name) {
      return;
    }
    this.name = name;
    this.type = name.replace(/\s/g, '').toLowerCase();
    this.tabName = this.type + 'Tab';
    this.icon = 'i/' + this.type + 'Icon.png';

    // set features
    this.features = {
      counter: false,
      direct: false,
      subject: false
    };

    object.mixin(this, options, true);
  }
  SvcBase.constructor = SvcBase;
  SvcBase.prototype = {
    clearCache: function (store) {
      //This first delete is only needed for 3.6 support.
      //Remove the call in accounts.js when it is removed.
      delete store[this.type + 'Contacts'];
    },
    //This method can be removed once 3.6 support is dropped.
    getContacts: function (store) {
      if (store[this.type + 'Contacts']) {
        var contacts = JSON.parse(store[this.type + 'Contacts']);
        return contacts;
      }
      return null;
    },
    //This method can be removed once 3.6 support is dropped.
    setContacts: function (store, contacts) {
      store[this.type + 'Contacts'] = JSON.stringify(contacts);
    },

    // stub function that should not return data for non-mail services
    // for the FF 3.6 extension.
    get36FormattedContacts: function () {
      return null;
    }
  };

  /* common functionality for email based services */
  function EmailSvcBase() {
    SvcBase.constructor.apply(this, arguments);
    this.features.direct = true;
    this.features.subject = true;
  }

  EmailSvcBase.prototype = new SvcBase();
  EmailSvcBase.constructor = EmailSvcBase;
  EmailSvcBase.prototype.validate = function (sendData) {
    if (!sendData.to || !sendData.to.trim()) {
      return false;
    }
    return true;
  };

  // The old top browser UI in the 3.6 extension expects the contacts data
  // as an array.
  // TODO: remove when Firefox 3.6 is no longer supported.
  EmailSvcBase.prototype.get36FormattedContacts = function (entries) {
    var data = [];
    entries.forEach(function (entry) {
      if (entry.emails && entry.emails.length) {
        entry.emails.forEach(function (email) {
          var displayName = entry.displayName ? entry.displayName : email.value;
          data.push({
            displayName: displayName,
            email: email.value
          });
        });
      }
    });
    return data;
  };

  EmailSvcBase.prototype.overlays = {
    'Contacts': 'ContactsEmail'
  };

  svcs = {
    domains: {
      'twitter.com': new SvcBase('Twitter', {
        features: {
          //TODO: remove direct when old UI is no longer in use,
          //or remove it from use.
          direct: true,
          subject: false,
          counter: true
        },
        shareTypes: [{
          type: 'public',
          name: 'public'
        }, {
          type: 'direct',
          name: 'direct message',
          showTo: true,
          toLabel: 'type in name of recipient'
        }],
        textLimit: 140,
        shorten: true,
        serviceUrl: 'http://twitter.com',
        revokeUrl: 'http://twitter.com/settings/connections',
        signOutUrl: 'http://twitter.com/logout',
        accountLink: function (account) {
          return 'http://twitter.com/' + account.username;
        },
        forceLogin: {
          name: 'force_login',
          value: true
        },
        overlays: {
          'Contacts': 'ContactsTwitter'
        }
      }),
      'facebook.com': new SvcBase('Facebook', {
        features: {
          //TODO: remove direct when old UI is no longer in use,
          //or remove it from use.
          direct: true,
          subject: false,
          counter: true,
          medium: true
        },
        shareTypes: [{
          type: 'wall',
          name: 'my wall'
        }, {
          type: 'groupWall',
          name: 'group wall',
          showTo: true,
          toLabel: 'type in the name of the group'
        }],
        textLimit: 420,
        serviceUrl: 'http://facebook.com',
        revokeUrl: 'http://www.facebook.com/editapps.php?v=allowed',
        signOutUrl: 'http://facebook.com',
        accountLink: function (account) {
          return 'http://www.facebook.com/profile.php?id=' + account.userid;
        },
        overlays: {
          'widgets/AccountPanel': 'widgets/AccountPanelFaceBook'
        }
      }),
      'google.com': new EmailSvcBase('Gmail', {
        shareTypes: [{
          type: 'direct',
          name: 'direct',
          showTo: true
        }],
        serviceUrl: 'https://mail.google.com',
        revokeUrl: 'https://www.google.com/accounts/IssuedAuthSubTokens',
        signOutUrl: 'http://google.com/preferences',
        accountLink: function (account) {
          return 'http://google.com/profiles/' + account.username;
        },
        forceLogin: {
          name: 'pape_max_auth_age',
          value: 0
        }
      }),
      'googleapps.com': new EmailSvcBase('Google Apps', {
        shareTypes: [{
          type: 'direct',
          name: 'direct',
          showTo: true
        }],
        icon: 'i/gmailIcon.png',
        serviceUrl: 'https://mail.google.com',
        revokeUrl: 'https://www.google.com/accounts/IssuedAuthSubTokens',
        signOutUrl: 'http://google.com/preferences',
        accountLink: function (account) {
          return 'http://google.com/profiles/' + account.username;
        },
        forceLogin: {
          name: 'pape_max_auth_age',
          value: 0
        }
      }),
      'yahoo.com': new EmailSvcBase('Yahoo', {
        shareTypes: [{
          type: 'direct',
          name: 'direct',
          showTo: true
        }],
        name: 'Yahoo!',
        serviceUrl: 'http://mail.yahoo.com', // XXX yahoo doesn't have ssl enabled mail?
        revokeUrl: 'https://api.login.yahoo.com/WSLogin/V1/unlink',
        signOutUrl: 'https://login.yahoo.com/config/login?logout=1',
        accountLink: function (account) {
          return 'http://profiles.yahoo.com/' + account.username;
        }
      }),
      'linkedin.com': new SvcBase('LinkedIn', {
        isNew: true,
        features: {
          //TODO: remove direct when old UI is no longer in use,
          //or remove it from use.
          direct: true,
          subject: true,
          counter: false
        },
        shareTypes: [{
          type: 'public',
          name: 'anyone'
        }, {
          type: 'myConnections',
          name: 'connections only',
          specialTo: 'connections-only'
        }, {
          type: 'contact',
          name: 'send message',
          showTo: true,
          toLabel: 'type in the name of the contact'
        }],
        serviceUrl: 'http://linkedin.com',
        revokeUrl: 'http://linkedin.com/settings/connections',
        signOutUrl: 'https://www.linkedin.com/secure/login?session_full_logout=&trk=hb_signout',
        accountLink: function (account) {
          return 'http://linkedin.com/' + account.username;
        },
        overlays: {
          'widgets/AccountPanel': 'widgets/AccountPanelLinkedIn',
          'Contacts': 'ContactsLinkedIn'
        }
      })
    },
    domainList: [],

    //Patch to allow old share UI to work
    //Remove when it goes away.
    svcBaseProto: SvcBase.prototype
  };

  // Build up an list of services
  for (prop in svcs.domains) {
    if (svcs.domains.hasOwnProperty(prop)) {
      svcs.domainList.push(prop);

      // Clear out the old contacts model.
      // TODO: Remove this once the 3.6 add-on/UI is finally
      // shut off.
      if (newHotness) {
        delete store[svcs.domains[prop].type + 'Contacts'];
        delete store.contactsModelVersion;
      }
    }
  }

  return svcs;
});
