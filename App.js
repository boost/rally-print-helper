Ext.define('CustomApp', {
    extend: 'Rally.app.App'
    ,componentCls: 'app'
    ,launch: function() {
        var self = this;

        self.buildTabs();
        self.buildIterationGrids();
    }

    ,buildTabs: (function() {
        var self = this;

        var tab = Ext.create('Ext.tab.Panel', {
            activeTab: 0
            ,border: false
        });

        self.tab = tab;
        self.add(tab);
    })

    ,buildIterationGrids: (function() {
        var self = this,
            tab = self.tab;

        var storiesGrid = self.buildGrid('User Stories');
        var backlogGrid = self.buildGrid('Backlog', true);

        self.storiesGrid = storiesGrid;
        self.backlogGrid = backlogGrid;

        tab.add(storiesGrid);
        tab.add(backlogGrid);
        tab.setActiveTab(0);
    })

    ,buildGrid: (function(title, hideIteration) {
        var self = this;

        var store = Ext.create('Rally.data.WsapiDataStore', {
            model: 'User Story'
            ,autoLoad: hideIteration
        });

        return Ext.create('Ext.grid.Panel', {
            title: title
            ,store: store
            ,columns: [
                { xtype: 'rownumberer' }
                ,{ text: 'ID',  dataIndex: 'FormattedID', flex: 1 }
                ,{ text: 'Story Name', dataIndex: 'Name', flex: 3 }
            ]
            ,selModel: Ext.create('Ext.selection.CheckboxModel', {
                mode: 'MULTI'
                ,allowDeselect: true
            })
            ,columnLines: true
            ,border: false
            ,tbar: self.buildTbar(hideIteration)
            ,emptyText: 'No records found'
        });
    })

    ,buildTbar: (function(hideIteration) {
        var self = this,
            items = [];

        if (hideIteration) {
            items = ['->', {
                text: 'Print'
            }];
        } else {
            var store = Ext.create('Rally.data.WsapiDataStore', {
                model: 'Iteration'
                ,fetch: true
            });

            var iterationBox = Ext.create('Ext.form.field.ComboBox', {
                store: store
                ,displayField: 'Name'
                ,valueField: 'ObjectID'
                ,triggerAction: 'all'
                ,listeners: {
                    scope: self
                    ,change: self.iterationCallback
                }
            });

            store.on('load', function(st) {
                iterationBox.setValue(st.getAt(0).get('ObjectID'));
            });

            store.load();

            items = [iterationBox, '->', {
                text: 'Print'
            }];
        }

        return items;
    })

    ,setIterationBoxValue: (function(store, data, success) {
        var self = this,
            iterationBox = self.iterationBox,
            firstRecord = store.getAt(0);

        iterationBox.setValue(firstRecord);
    })

    ,iterationCallback: (function(cmb, recordId, oldVal, opts) {
        var self = this,
            storiesStore = self.storiesGrid.getStore();

        var filters = [{
            property: 'Iteration'
            ,operator: '='
            ,value: '/iteration/' + recordId
        }];

        storiesStore.reload({
            filters: filters
        });

        storiesStore.filter(filters);
    })
});
