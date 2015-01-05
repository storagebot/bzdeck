/**
 * BzDeck Settings Page View
 * Copyright © 2015 Kohei Yoshino. All rights reserved.
 */

BzDeck.views.SettingsPage = function SettingsPageView (tab_id) {
  // Activate tabs
  this.$$tablist = new FlareTail.widget.TabList(document.querySelector('#settings-tablist'));

  if (tab_id) {
    this.$$tablist.view.selected = this.$$tablist.view.$focused = document.querySelector(`#settings-tab-${tab_id}`);
  }

  // Activate token input
  this.activate_token_input();

  // Currently the radiogroup/radio widget is not data driven.
  // A modern preference system is needed.
  this.activate_radiogroups();
};

BzDeck.views.SettingsPage.prototype = Object.create(BzDeck.views.BaseView.prototype);
BzDeck.views.SettingsPage.prototype.constructor = BzDeck.views.SettingsPage;

BzDeck.views.SettingsPage.prototype.activate_token_input = function () {
  let account = BzDeck.models.data.account,
      token = account.token,
      $input = document.querySelector('#tabpanel-settings-account-token'),
      $output = $input.nextElementSibling;

  if (token) {
    $input.value = token;
    $output.textContent = 'Verified'; // l10n
  }

  $input.addEventListener('input', event => {
    $output.textContent = '';

    if ($input.value.length !== 10) {
      return;
    }

    let params = new URLSearchParams();

    params.append('names', account.name);
    params.append('token', `${account.id}-${$input.value}`);

    $output.textContent = 'Verifying...'; // l10n

    BzDeck.controllers.core.request('GET', 'user', params).then(result => {
      if (result.users) {
        // Save the token
        account.token = $input.value;
        BzDeck.models.accounts.save_account(account);
        // Update the view
        $input.setAttribute('aria-invalid', 'false');
        $output.textContent = 'Verified'; // l10n
        // Fire an event
        FlareTail.util.event.trigger(window, 'Account:AuthTokenVerified');
      } else {
        $input.setAttribute('aria-invalid', 'true');
        $output.textContent = 'Invalid, try again'; // l10n
      }
    }).catch(error => BzDeck.views.statusbar.show(error.message));
  });
};

BzDeck.views.SettingsPage.prototype.activate_radiogroups = function () {
  let $root = document.documentElement, // <html>
      activate = this.activate_radiogroup.bind(this);

  // Theme
  activate('ui.theme.selected', 'Light', value => FlareTail.util.theme.selected = value);

  // Timezone & Date Format
  activate('ui.date.timezone', 'local', value => FlareTail.util.datetime.options.timezone = value);
  activate('ui.date.relative', true, value => FlareTail.util.datetime.options.relative = value);

  // Notifications
  activate('notifications.show_desktop_notifications', true, value => {
    if (value === true && Notification.permission === 'default') {
      FlareTail.util.app.auth_notification();
    }
  });
  activate('notifications.ignore_cc_changes', true);

  // Home
  activate('ui.home.layout', 'vertical', value => BzDeck.views.pages.home.change_layout(value, true));

  // Timeline
  activate('ui.timeline.sort.order', 'ascending', value => {
    $root.setAttribute('data-timeline-sort-order', value);
  });
  activate('ui.timeline.font.family', 'proportional', value => {
    $root.setAttribute('data-timeline-font-family', value);
  });
  activate('ui.timeline.show_cc_changes', false, value => {
    $root.setAttribute('data-timeline-show-cc-changes', String(value));
  });
  activate('ui.timeline.display_attachments_inline', true, value => {
    $root.setAttribute('data-timeline-display-attachments-inline', String(value));

    if (value === true) {
      // Show media
      for (let $attachment of document.querySelectorAll('[itemprop="attachment"]')) {
        let $media = $attachment.querySelector('img, audio, video');

        if ($media && !$media.src) {
          $media.parentElement.setAttribute('aria-busy', 'true');
          $media.src = $attachment.querySelector('[itemprop="contentUrl"]').itemValue;
        }
      }
    }
  });
};

BzDeck.views.SettingsPage.prototype.activate_radiogroup = function (pref, default_value, callback) {
  let $rgroup = document.querySelector(`#tabpanel-settings [data-pref="${pref}"]`),
      prefs = BzDeck.models.data.prefs,
      type = $rgroup.dataset.type || 'string',
      value = prefs[pref] !== undefined ? prefs[pref] : default_value;

  for (let $radio of $rgroup.querySelectorAll('[role="radio"]')) {
    $radio.tabIndex = 0;
    $radio.setAttribute('aria-checked', $radio.dataset.value === String(value));
  }

  (new this.widget.RadioGroup($rgroup)).bind('Selected', event => {
    let _value = event.detail.items[0].dataset.value,
        value = type === 'boolean' ? _value === 'true' : _value;

    prefs[pref] = value;

    if (callback) {
      callback(value);
    }
  });
};