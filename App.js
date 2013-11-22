/**
 * Boost Rally Print Helper
 * Boost New Media
 * Contributors:
 * - Benedict Aluan
 * - Joe Auslander
 */

/** --------------------------------------------------------------------
 *  Boost.rally.PrintGrid
 *  Custom component encapsulate all print helper grid functions
 *  --------------------------------------------------------------------
 */

Ext.define('Boost.rally.PrintGrid', {
    extend: 'Ext.grid.Panel'
    ,alias: 'widget.printgrid'
    ,title: 'Print Grid'
    ,columnLines: true
    ,border: false
    ,emptyText: 'No records found'
    ,hideIteration: false
    ,styleSheetPath: 'print.css'
    ,remote: false
    ,initComponent: function() {
        var self = this,
            config = {};

        self._setRemote();
        self._buildColumns(config);
        self._buildSelectionModel(config);
        self._buildTbar(config);

        Ext.apply(this, config);
        this.callParent(arguments);
    }

    ,_setRemote: (function() {
        var self = this,
            url = window.location.origin,
            expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi,
            regex = new RegExp(expression);

        if (url.match(regex)) {
            self.remote = true;
        }
    })

    ,_buildColumns: (function(config) {
        config.columns = [
            { xtype: 'rownumberer' }
            ,{ text: 'ID',  dataIndex: 'FormattedID', flex: 1, sortable: false }
            ,{ text: 'Story Name', dataIndex: 'Name', flex: 3, sortable: false }
        ];
    })

    ,_buildSelectionModel: (function(config) {
        var self = this;

        config.selModel = Ext.create('Ext.selection.CheckboxModel', {
            mode: 'MULTI'
            ,allowDeselect: true
            ,listeners: {
                scope: self
                ,selectionchange: self._selectRecord
            }
        });
    })

    ,_buildTbar: (function(config) {
        var self = this,
            items = [];

        var printBtn = Ext.create('Ext.button.Button', {
            text: 'Print'
            ,handler: self._printIteration
            ,scope: self
            ,disabled: true
        });

        self.printBtn = printBtn;

        if (self.hideIteration) {
            items = ['->', printBtn];
        } else {
            var store = Ext.create('Rally.data.WsapiDataStore', {
                model: 'Iteration'
                ,fetch: true
                ,sorters: [{
                    property: 'EndDate'
                    ,direction: 'DESC'
                }]
            });

            var iterationBox = Ext.create('Ext.form.field.ComboBox', {
                store: store
                ,displayField: 'Name'
                ,valueField: 'ObjectID'
                ,triggerAction: 'all'
                ,listeners: {
                    scope: self
                    ,change: self._iterationCallback
                }
            });

            store.on('load', function(st) {
                iterationBox.setValue(st.getAt(0).get('ObjectID'));
            });

            store.load();

            items = [iterationBox, '->', printBtn];
        }

        config.tbar = items;
    })

    ,_printIteration: (function(cb) {
        var self = this,
            selections = self.getSelectionModel().getSelection();

        if (selections.length > 0) {
            self._buildTemplate(selections);
        }
    })

    ,_buildTemplate: (function(selections) {
        var self = this,
            data = self._sanitizeData(selections);

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
                        '<span class="estimate">Size: {estimate}</span>',
                        '<span class="rank">Rank: {#}</span>',
                        '</div>',
                    '</div>',
                '</div>',
                '<div class="{defineBreak}"></div>',
            '</tpl>'
        ]);

        var markup = tpl.apply(data);

        self._printCards(markup);
    })

    ,_selectRecord: (function(selModel) {
        var self = this;

        selModel.hasSelection() ? self.printBtn.enable() : self.printBtn.disable();
    })

    ,_sanitizeData: (function(selections) {
        var data = {
            artifacts: []
        };

        Ext.Array.each(selections, function(selection) {
            var obj = {
                name: selection.get('Name')
                ,description: selection.get('Description')
                ,id: selection.get('FormattedID')
                ,estimate: selection.get('PlanEstimate')
            };

            if (selection.get('Owner')) {
                obj['owner'] = selection.get('Owner')['_refObjectName']
            }

            data.artifacts.push(obj);
        });

        return data;
    })

    ,_iterationCallback: (function(cmb, recordId, oldVal, opts) {
        var self = this,
            store = self.getStore();

        var filters = [{
            property: 'Iteration'
            ,operator: '='
            ,value: '/iteration/' + recordId
        }];

        store.reload({
            filters: filters
        });

        store.filter(filters);
    })

    ,_printCards: (function(markup) {
        var self = this,
            options = 'toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500',
            win = window.open('', self.printTitle, options),
            doc = win.document;

        doc.write('<html><head><title>' + self.printTitle + '</title>');

        if (self.remote) {
            doc.write('<link href=https://raw.github.com/boost/rally-print-helper/master/print.css rel="stylesheet" type="text/css" media="screen,print" />');
        } else {
            doc.write('<link href="' + self.styleSheetPath + '" rel="stylesheet" type="text/css" media="screen,print" />');
        }

        doc.write('</head><body class="landscape">');
        doc.write(markup);
        doc.write('</body></html>');
        doc.close();

        win.focus();
        win.print();
        return false;
    })
});

/** --------------------------------------------------------------------
 *  CustomApp
 *  Builds the layout
 *  --------------------------------------------------------------------
 */

Ext.define('CustomApp', {
    extend: 'Rally.app.App'
    ,componentCls: 'app'
    ,printTitle: 'Boost Print Helper'
    ,launch: function() {
        var self = this;

        self._buildTabs();
    }

    ,_buildTabs: (function() {
        var self = this;

        // User stories
        var userStoriesGrid = Ext.create('Boost.rally.PrintGrid', {
            store: Ext.create('Rally.data.WsapiDataStore', {
                model: 'User Story'
                ,autoLoad: false
                ,sorters: [{
                    property: 'Rank'
                    ,direction: 'ASC'
                }]
            })
            ,title: 'User Stories'
        });

        // Backlog
        var backlogStore = Ext.create('Rally.data.WsapiDataStore', {
            model: 'User Story'
            ,autoLoad: false
            ,sorters: [{
                property: 'Rank'
                ,direction: 'ASC'
            }]
        });

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

        backlogStore.filter(filters);

        var backlogGrid = Ext.create('Boost.rally.PrintGrid', {
            store: backlogStore
            ,hideIteration: true
            ,title: 'Backlog'
        });


        var tab = Ext.create('Ext.tab.Panel', {
            activeTab: 0
            ,border: false
            ,items: [userStoriesGrid, backlogGrid]
        });

        self.add(tab);
    })
});
