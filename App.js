Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    columnCfgs: [
        {xtype: 'rownumberer'},
        {text: 'Rank',  dataIndex: 'Rank', flex: 1},
        {text: 'ID',  dataIndex: 'FormattedID', flex: 1},
        {text: 'Story Name', dataIndex: 'Name', flex: 3}
    ],
    launch: function() {
        var self = this;

        self.buildTabs();
        self.buildStoriesGrid();
        self.buildBacklogGrid();
    },

    buildTabs: (function() {
        var self = this;

        var tab = Ext.create('Ext.tab.Panel', {
            activeTab: 0,
            border: false
        });

        self.tab = tab;
        self.add(tab);
    }),

    buildStoriesGrid: (function() {
        var self = this,
            tab = self.tab;

        var store = Ext.create('Rally.data.WsapiDataStore', {
            model: 'User Story',
            autoLoad: true,
            fetch: true
        });

        var rallyGrid = Ext.create('Rally.ui.grid.Grid', {
            title: 'User Stories',
            model: 'User Story',
            store: store,
            enableRanking: true,
            border: false,
            columnCfgs: [
                { xtype: 'rownumberer'},
                { text: 'ID',  dataIndex: 'FormattedID', flex: 1 },
                { text: 'Story Name', dataIndex: 'Name', flex: 3 }
            ],
            tbar: self.buildTbar(),
            selModel: Ext.create('Ext.selection.CheckboxModel', {
                mode: 'MULTI',
                allowDeselect: true
            }),
            selType: 'checkboxmodel',
            columnLines: true
        });

        tab.add(rallyGrid);
        tab.setActiveTab(0);
    }),

    buildBacklogGrid: (function() {
        var self = this;
    }),

    buildTbar: (function() {
        var self = this;

        return [{
            xtype: 'rallyiterationcombobox',
            hidden: false,
            listeners: {
                scope: self,
                ready: self.iterationCallback,
                select: self.iterationCallback
            }
        }, '->', {
            text: 'Print'
        }];
    }),

    iterationCallback: (function(cmb, scope) {
        var self = this,
            grid = self.tab.getActiveTab(),
            store = grid.getStore(),
            internalId = cmb.getRecord().get('_ref');

        store.filter([{
            property: 'Iteration',
            operator: '=',
            value: internalId
        }]);
    })
});
