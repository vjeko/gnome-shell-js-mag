// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const St = imports.gi.St;

const Lang = imports.lang;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Meta = imports.gi.Meta;

const FADE_TIME = 0.1;

const OsdMonitorLabel = new Lang.Class({
    Name: 'OsdMonitorLabel',

    _init: function(monitor, label) {
        this._actor = new St.Widget({ opacity: 0,
                                      x_expand: true,
                                      y_expand: true });

        this._monitor = monitor;

        this._box = new St.BoxLayout({ style_class: 'osd-window',
                                       vertical: true });
        this._actor.add_actor(this._box);

        this._label = new St.Label({ style_class: 'osd-monitor-label',
                                     text: label });
        this._box.add(this._label);

        Main.uiGroup.add_child(this._actor);
        Main.uiGroup.set_child_above_sibling(this._actor, null);
        this._position();

        Meta.disable_unredirect_for_screen(global.screen);
        Tweener.addTween(this._actor,
                         { opacity: 255,
                           time: FADE_TIME,
                           transition: 'easeOutQuad' });
    },

    _position: function() {
        let workArea = Main.layoutManager.getWorkAreaForMonitor(this._monitor);

        if (Clutter.get_default_text_direction() == Clutter.TextDirection.RTL)
            this._box.x = workArea.x + (workArea.width - this._box.width);
        else
            this._box.x = workArea.x;

        this._box.y = workArea.y;
    },

    destroy: function() {
        Tweener.addTween(this._actor,
                         { opacity: 0,
                           time: FADE_TIME,
                           transition: 'easeOutQuad',
                           onComplete: Lang.bind(this, function() {
                               this._actor.destroy();
                               Meta.enable_unredirect_for_screen(global.screen);
                           })
                         });
    }
});

const OsdMonitorLabeler = new Lang.Class({
    Name: 'OsdMonitorLabeler',

    _init: function() {
        this._monitorManager = Meta.MonitorManager.get();
        this._client = null;
        this._clientWatchId = 0;
        this._osdLabels = [];
        this._monitorLabels = null;
        Main.layoutManager.connect('monitors-changed',
                                    Lang.bind(this, this._reset));
        this._reset();
    },

    _reset: function() {
        for (let i in this._osdLabels)
            this._osdLabels[i].destroy();
        this._osdLabels = [];
        this._monitorLabels = new Map();
        let monitors = Main.layoutManager.monitors;
        for (let i in monitors)
            this._monitorLabels.set(monitors[i].index, []);
    },

    _trackClient: function(client) {
        if (this._client)
            return (this._client == client);

        this._client = client;
        this._clientWatchId = Gio.bus_watch_name(Gio.BusType.SESSION, client, 0, null,
                                                 Lang.bind(this, function(c, name) {
                                                     this.hide(name);
                                                 }));
        return true;
    },

    _untrackClient: function(client) {
        if (!this._client || this._client != client)
            return false;

        Gio.bus_unwatch_name(this._clientWatchId);
        this._clientWatchId = 0;
        this._client = null;
        return true;
    },

    show: function(client, params) {
        if (!this._trackClient(client))
            return;

        this._reset();

        for (let id in params) {
            let monitor = this._monitorManager.get_monitor_for_output(id);
            if (monitor == -1)
                continue;
            this._monitorLabels.get(monitor).push(params[id].deep_unpack());
        }

        // In mirrored display setups, more than one physical outputs
        // might be showing the same logical monitor. In that case, we
        // join each output's labels on the same OSD widget.
        for (let [monitor, labels] of this._monitorLabels.entries()) {
            labels.sort();
            this._osdLabels.push(new OsdMonitorLabel(monitor, labels.join(' ')));
        }
    },

    hide: function(client) {
        if (!this._untrackClient(client))
            return;

        this._reset();
    }
});
