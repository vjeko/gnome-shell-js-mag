// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const GnomeBluetooth = imports.gi.GnomeBluetooth;
const Lang = imports.lang;
const St = imports.gi.St;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const BUS_NAME = 'org.gnome.SettingsDaemon.Rfkill';
const OBJECT_PATH = '/org/gnome/SettingsDaemon/Rfkill';

const RfkillManagerInterface = '<node> \
<interface name="org.gnome.SettingsDaemon.Rfkill"> \
<property name="BluetoothAirplaneMode" type="b" access="readwrite" /> \
<property name="BluetoothHasAirplaneMode" type="b" access="read" /> \
</interface> \
</node>';

const RfkillManagerProxy = Gio.DBusProxy.makeProxyWrapper(RfkillManagerInterface);

const Indicator = new Lang.Class({
    Name: 'BTIndicator',
    Extends: PanelMenu.SystemIndicator,

    _init: function() {
        this.parent();

        this._indicator = this._addIndicator();
        this._indicator.icon_name = 'bluetooth-active-symbolic';

        this._proxy = new RfkillManagerProxy(Gio.DBus.session, BUS_NAME, OBJECT_PATH,
                                             Lang.bind(this, function(proxy, error) {
                                                 if (error) {
                                                     log(error.message);
                                                     return;
                                                 }

                                                 this._sync();
                                             }));
        this._proxy.connect('g-properties-changed', Lang.bind(this, this._sync));

        // The Bluetooth menu only appears when Bluetooth is in use,
        // so just statically build it with a "Turn Off" menu item.
        this._item = new PopupMenu.PopupSubMenuMenuItem('', true);
        this._item.icon.icon_name = 'bluetooth-active-symbolic';
        this._item.menu.addAction(_("Turn Off"), Lang.bind(this, function() {
            this._proxy.BluetoothAirplaneMode = true;
        }));
        this._item.menu.addSettingsAction(_("Bluetooth Settings"), 'gnome-bluetooth-panel.desktop');
        this.menu.addMenuItem(this._item);

        this._client = new GnomeBluetooth.Client();
        this._model = this._client.get_model();
        this._model.connect('row-changed', Lang.bind(this, this._sync));
        this._model.connect('row-deleted', Lang.bind(this, this._sync));
        this._model.connect('row-inserted', Lang.bind(this, this._sync));
        Main.sessionMode.connect('updated', Lang.bind(this, this._sync));
        this._sync();
    },

    _getDefaultAdapter: function() {
        let [ret, iter] = this._model.get_iter_first();
        while (ret) {
            let isDefault = this._model.get_value(iter,
                                                  GnomeBluetooth.Column.DEFAULT);
            if (isDefault)
                return iter;
            ret = this._model.iter_next(iter);
        }
        return null;
    },

    _getNConnectedDevices: function() {
        let adapter = this._getDefaultAdapter();
        if (!adapter)
            return 0;

        let nDevices = 0;
        let [ret, iter] = this._model.iter_children(adapter);
        while (ret) {
            let isConnected = this._model.get_value(iter,
                                                    GnomeBluetooth.Column.CONNECTED);
            if (isConnected)
                nDevices++;
            ret = this._model.iter_next(iter);
        }
        return nDevices;
    },

    _sync: function() {
        let nDevices = this._getNConnectedDevices();
        let sensitive = !Main.sessionMode.isLocked && !Main.sessionMode.isGreeter;

        this.menu.setSensitive(sensitive);
        this._indicator.visible = nDevices > 0;
        this._item.actor.visible = this._proxy.BluetoothHasAirplaneMode && !this._proxy.BluetoothAirplaneMode;

        if (nDevices > 0)
            /* Translators: this is the number of connected bluetooth devices */
            this._item.label.text = ngettext("%d Connected", "%d Connected", nDevices).format(nDevices);
        else
            this._item.label.text = _("Not In Use");
    },
});
