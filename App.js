Ext.define('CustomApp', {
    extend: 'Rally.app.App'
    ,componentCls: 'app'
    ,printTitle: 'Boost Print Helper'
    ,launch: function() {
        var self = this

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
            ,autoLoad: false
            ,sorters: [{
                property: 'Rank'
                ,direction: 'ASC'
            }]
        });

        if (hideIteration) {
            var filters = [{
                property: 'Release'
                ,operator: '='
                ,value: 'null'
            }, {
                property: 'Iteration'
                ,operator: '='
                ,value: 'null'
            }, {
                property: 'DirectChildrenCount'
                ,operator: '='
                ,value: '0'
            }];

            store.filter(filters);
        }

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
                ,handler: self.printIteration
                ,scope: self
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
                ,handler: self.printIteration
                ,scope: self
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

    ,printIteration: (function(cb) {
        var self = this,
            grid = cb.findParentByType('grid'),
            selections = grid.getSelectionModel().getSelection();

        if (selections.length > 0) {
            self.buildTemplate(selections);
        }
    })

    ,buildTemplate: (function(selections) {
        var self = this,
            data = self.sanitizeData(selections);

        var tpl = new Ext.XTemplate([
            '<tpl for="artifacts">',
                '<div class="artifact">',
                    '<div class="ratio-control">',
                        '<div class="card-frame">',
                            '<div class="header">',
                                '<span class="storyID">{id}</span>',
                                '<span class="ownerText">{owner}</span>',
                            '</div>',
                            '<div class="content">',
                                '<span class="card-title">{name}</span>',
                                '<span class="description">{description}</span>',
                            '</div>',
                            '<span class="estimate">{estimate}</span>',
                            '<span class="rank">{#}</span>',
                        '</div>',
                    '</div>',
                '</div>',
                '<div class="{defineBreak}"></div>',
            '</tpl>'
        ]);

        var markup = tpl.apply(data);

        self.printCards(markup);
    })

    ,printCards: (function(markup) {
        var self = this,
            options = 'toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500',
            win = window.open('', self.printTitle, options),
            doc = win.document;

        doc.write('<html><head><title>' + self.printTitle + '</title>');
        doc.write('<link href=https://raw.github.com/boost/rally-print-helper/master/print.css rel="stylesheet" type="text/css" media="screen,print" />');
        doc.write('</head><body class="landscape">');
        doc.write(markup);
        doc.write('</body></html>');
        doc.close();

        win.focus();
        win.print();
        return false;
    })

    ,sanitizeData: (function(selections) {
        var data = {
            artifacts: []
        };

        Ext.Array.each(selections, function(selection) {
            data.artifacts.push({
                name: selection.get('Name')
                ,description: selection.get('Description')
                ,id: selection.get('FormattedID')
                ,owner: selection.get('Owner')['_refObjectName']
                ,estimate: selection.get('PlanEstimate')
            })
        });

        return data;
    })
});
