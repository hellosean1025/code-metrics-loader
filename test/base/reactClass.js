import format from 'utils/format';
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Table, Tooltip, Icon} from 'antd';
import {renderColSpanCreater} from 'utils/mergeTableCell';
import calculateSize from 'calculate-size';
import './index.scss';
import {debounce} from 'lodash';
import watchProps from 'utils/watchProps';
import ChainRatioView from 'pc-components/chain-ratio-view';
import {max, maxBy, find} from 'lodash';
import TinyLineChart from './tiny-line-chart'
import toTreeData, {getOrderDataByTreeData} from 'utils/toTreeData'

const iconStyle ={fontSize: '10px', cursor: 'pointer'}

/**
 * 为避免跟antd 冲突，使用 _children
 */
const EasyTableLevelChildField = '_children'

const defaultPageConfig = {
  hideOnSinglePage: true,
  pageSize: 10
};

const tooltipStyle = {
  position: 'relative',
}



function getWidth (width, maxWidth) {
  width = width + 12;
  if (width < 40) width = 30;
  if (maxWidth > 0 && width > maxWidth) width = maxWidth;
  return width;
}

function getWidthByStr (str, extraWidth = 20) {
  if(!str || str === '--'){
    return 40;
  }
  if(!isNaN(str))str = str + '';
  if(str && typeof str === 'string'){
    const size = calculateSize (str, {
      font: 'Chinese Quote',
      fontSize: '14px',
    });
    return size.width + extraWidth;
  }
  return 100;
  
}

const sortFuns = {
  number: (a = 0, b = 0) => a - b,
  string: (a = '', b = '') => a.localeCompare (b, 'zh'),
};

function getStyle (element, styleName) {
  try {
    var computed = document.defaultView.getComputedStyle (element, '');
    return element.style[styleName] || computed ? computed[styleName] : null;
  } catch (e) {
    return element.style[styleName];
  }
}

@watchProps
export default class EasyTable extends PureComponent {
  static propTypes = {
    columns: PropTypes.array.isRequired,
    dataSource: PropTypes.array.isRequired,
    remoteRequest: PropTypes.func,
    maxWidth: PropTypes.number,
    minWidth: PropTypes.number,
    enableAutoComputedWidth: PropTypes.bool,
    useTitleWidth: PropTypes.bool,
    pagination:PropTypes.any,
    supportLevel: PropTypes.any, // true 开启，并且展开所有行，false 关闭，1 代表默认只展示一级
    /**
     * 折叠的列 dataIndex
     */
    levelField: PropTypes.string
  };

  static defaultProps = {
    maxWidth: 0,
    minWidth: 0,
    enableAutoComputedWidth: true,
    useTitleWidth: false,
    pagination: {},
    levelField: ''
  };

  constructor (props) {
    super (props);

    this.state = {
      currentPageData: [],
      cellStatus: {},
      sortedInfo:{},
      expandedRowKeys: [],
      dataSource: props.dataSource
    };

    if(!this.props.pagination){
      this.state.pagination = {
        hideOnSinglePage:true,
        pageSize: 10000
      }
    }else{
      this.state.pagination = {
        ...defaultPageConfig,
        ...this.props.pagination
      }
    }
  }

  handleExpand = (record, type= 'down')=>{
    let newExpandedRowKeys = [].concat(this.state.expandedRowKeys);
    const _hander = (_record, type = 'down')=>{
      _record[EasyTableLevelChildField].forEach(item=>{
        if(type === 'down'){
          newExpandedRowKeys.push(item.levelId)
        }else if(type === 'right'){
          let index = newExpandedRowKeys.indexOf(item.levelId);
          if(index !== -1){
            delete newExpandedRowKeys[index]
          }
          if(Array.isArray(item[EasyTableLevelChildField])){
            _hander(item, type)
          }
        }
      })
    }
    _hander(record, type)
    
    newExpandedRowKeys = newExpandedRowKeys.filter(p=>p)
    this.setState({
      expandedRowKeys: newExpandedRowKeys
    })
    
  }

  watch = {
    pagination: function (page) {
      this.setState ({
        pagination: {
          ...this.state.pagination,
          ...page
        },
      });
    },
    dataSource: function(dataSource){
      const {supportLevel} = this.props;
      if(supportLevel){
        const expandedRowKeys = []
        let treeData = toTreeData(dataSource, {
          idField: 'levelId',
          pidField: 'levelPid',
          childrenField: EasyTableLevelChildField,
          enableLevelDepthComputed: true
        })

        dataSource = getOrderDataByTreeData(treeData, EasyTableLevelChildField)

        if(supportLevel == 1){
          dataSource.forEach(d=>{
            if(d.levelDepth == 1){
              expandedRowKeys.push(d.levelId)
            }
          })
        }else{
          dataSource.forEach(d=>{
            expandedRowKeys.push(d.levelId)
          })
        }
        
        this.setState({
          expandedRowKeys
        })
      }

      this.setState({
        dataSource
      })

      
    }
  };

  handleData (data) {
    return data.map ((item, index) => {
      if(item.key)return item;
      return {
        key: index,
        ...item,
      };
    });
  }

  static getDerivedStateFromProps (nextProps, prevState) {
    if (nextProps.dataSource !== prevState.prevDataSource) {
      return {
        prevDataSource: nextProps.dataSource,
      };
    }
    return null;
  }

  componentDidUpdate (prevProps) {
    if (this.state.prevDataSource !== prevProps.dataSource) {
      this._changePageDataSign = true;
      this.updateCurrentPageData ();
    }
  }

  componentWillUnmount() {
    this.isCancelled = true;
  }

  updateCurrentPageData = debounce (() => {
    if (!this._changePageDataSign) {
      return;
    }
    this._changePageDataSign = false;
    try {
      if(this.isCancelled)return;
      this.setState ({
        currentPageData: this.Table.getCurrentPageData (),
      });
    } catch (err) {
      console.error (err);
    }
  }, 50);

  onMouseEnter = key => {
    return e => {
      let cellChild = e.target.parentNode;
      const range = document.createRange ();
      range.setStart (cellChild, 0);
      range.setEnd (cellChild, cellChild.childNodes.length);
      // use range width instead of scrollWidth to determine whether the text is overflowing
      // to address a potential FireFox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1074543#c3
      const rangeWidth = range.getBoundingClientRect ().width;
      const padding =
        (parseInt (getStyle (cellChild, 'paddingLeft'), 10) || 0) +
        (parseInt (getStyle (cellChild, 'paddingRight'), 10) || 0);

      if (
        rangeWidth + padding > cellChild.offsetWidth ||
        cellChild.scrollWidth > cellChild.offsetWidth
      ) {
        this.setCellStatus (key, true);
      }
    };
  };

  handleChange = (pagination, filters, sorter) => {
    if (this.props.remoteRequest) {
      const pager = {...this.state.pagination};
      pager.current = pagination.current;
      this.setState ({
        pagination: pager,
      });
      this.props.remoteRequest ({
        limit: pagination.pageSize,
        page: pagination.current,
        sortField: sorter.field,
        sortOrder: sorter.order,
        ...filters,
      });
    }
    this._changePageDataSign = true;
    this.updateCurrentPageData ();
    this.setState({
      sortedInfo: sorter
    })
  };

  setCellStatus = debounce ((key, value) => {
    this.setState ({
      cellStatus: {
        [key]: value,
      },
    });
  }, 50);

  onMouseLeave = key => {
    return () => this.setCellStatus (key, false);
  };

  checkIsValue (type) {
    if (
      type === 'number' ||
      type === 'float' ||
      type === 'percent' ||
      type === 'pp' ||
      type === 'int' ||
      type === 'chainPercentRatio' ||
      type === 'chainPPRatio'
    ) {
      return true;
    }
    return false;
  }

  getChildLevel(children){
    let result = maxBy(children, c=> {
      return c.levelDepth;
    });
    if(result)return result.levelDepth;
    return 0;
  }

  handleColumns (columns, currentPageData) {
    const {sortedInfo} = this.state;
    if(columns.length === 0)return []
    let  levelColumn = this.props.columns[0];
    if(!levelColumn)return []
    if(this.props.levelField){
      levelColumn = find(this.props.columns, c=> c.dataIndex == this.props.levelField)
    }
    
    const renderColSpan = renderColSpanCreater ();
    return columns.map (item => {
      item = Object.assign({}, item)
      let {type, sort} = item;
      
      if(item.dataIndex === 'total_person_effect'){
        console.log(111)
      }

      let titleWidth = getWidthByStr(item.title || '', extraWidth);
      if (sort === true) {
        titleWidth += 10;
        if (this.checkIsValue (type)) {
          item.sorter = (a, b) =>
            sortFuns.number (a[item.dataIndex], b[item.dataIndex]);
        } else {
          item.sorter = (a, b) =>
            sortFuns.string (a[item.dataIndex], b[item.dataIndex]);
        }
        item.sortOrder = sortedInfo.columnKey === item.dataIndex && sortedInfo.order
      }
      if (Array.isArray (item.children)) {
        item.children = this.handleColumns (item.children, currentPageData);
      }
      if (!item.align) {
        if (this.checkIsValue (item.type)) {
          item.align = 'right';
        } else {
          item.align = 'left';
        }
        if (!item.dataIndex) {
          item.align = 'center';
        }
      }
      if (item.help) {
        titleWidth += 10;
        item.title = (
          <span _key={item.dataIndex} style={tooltipStyle}>
            {item.title}
            &nbsp;
            <Tooltip
              placement="top"
              title={<span dangerouslySetInnerHTML={{__html: item.help}} />}
            >
              <Icon type="question-circle" theme="outlined" />
            </Tooltip>
          </span>
        );
        delete item.help;
      }else{
        item.title = <span _key={item.dataIndex}>{item.title}</span>
      }

      let extraWidth = 20;

      function repeatStr(str, number){
        let newStr = ''
        for(let i=0; i< number; i++){
          newStr += str;
        }
        return newStr
      }

      if(item.dataIndex === levelColumn.dataIndex && this.props.supportLevel){
        let nums = this.getChildLevel(currentPageData)
        if(nums > 1){
          extraWidth = 22 * nums + 20;
        }

        let parentRender = item.render;

        let _render= (isReturnText = true)=> (text, record)=>{
          
          let levelDepth = record.levelDepth;
          /**
           * 避免跟 antd 冲突，使用 _children
           */
          let emptyPrefix = repeatStr('　', levelDepth - 1) ;
          let prefix = <span key="empty">{emptyPrefix}</span>;

          if(Array.isArray(record[EasyTableLevelChildField]) && record[EasyTableLevelChildField].length > 0){
            if(this.state.expandedRowKeys.indexOf(
              record[EasyTableLevelChildField][0].levelId
            ) !== -1){  
              prefix = [
                <span key="empty">{emptyPrefix}</span>,
                <Icon key="down" onClick={()=>this.handleExpand(record, 'right')} style={iconStyle} type="down" /> 
              ]
            }else{
              prefix = [
                <span key="empty">{emptyPrefix}</span>,
                <Icon key="right" onClick={()=>this.handleExpand(record, 'down')}   style={iconStyle}  type="right" />
              ]
            }
          }
          if(isReturnText)return [].concat(prefix, text);
          return prefix;
        }

        item.render = (...args)=>{
          if(parentRender){
            let prefix = _render(false).apply(this, args)
            let parent = parentRender.apply(this,  args)
            return <span>{prefix}{parent}</span>
          }
          return _render().apply(this, args)
        }
        
      }

      let width =
        max (
          currentPageData.map (page => {
            let str = page[item.dataIndex];
            let type = item.type;
            if (type === 'chainPercentRatio' || type === 'chainPPRatio') {
              type = 'pp';
              str = format (str, type) + '--';
            } else {
              str = format (str, type);
            }

            str = str === '--' ? '' : str;
            return getWidthByStr (str, extraWidth);
          })
        ) || 0;
      if (this.props.useTitleWidth) {
        width = titleWidth > width ? titleWidth : width;
      }
      if(item.type === 'chart'){
        item.width = 138;
      }

      if (!item.width && width) {
        item.width = getWidth (width, this.props.maxWidth);
        if (this.props.maxWidth > 0 && item.width >= this.props.maxWidth) {
          item.showOverflowTooltip = true;
        }
        if(this.props.minWidth > 0 && item.width <= this.props.minWidth){
          item.width = this.props.minWidth;
        }
      }

      const defaultRender =  (text, record, index, originText, pageData) => {
        if (type === 'chainPercentRatio') {
          text = (
            <ChainRatioView
              label={item.chainRationName}
              value={text}
              type="percent"
            />
          );
        } else if (type === 'chainPPRatio') {
          text = (
            <ChainRatioView
              label={item.chainRationName}
              value={text}
              type="pp"
            />
          );
        } else if(type === 'chart'){
          let position = 'bottom';
          try{
            if(pageData.length === (index + 1)){
              position = 'top'
            }
          }catch(e){}
          let chartValueType = 'string';
          try{
            chartValueType = text[0].type;
          }catch(e){}
          text = (
            <TinyLineChart type={chartValueType} position={position} data={text} />
          )
        }else {
          if (item.enableRowAutoSpan && item.dataIndex && text) {
            text = renderColSpan (currentPageData, text, index, item.dataIndex);
          }

          if (!item.enableRowAutoSpan && item.showOverflowTooltip) {
            const visibleKey = item.dataIndex + '_' + index;
            return (
              <div
                onMouseLeave={this.onMouseLeave (visibleKey)}
                onMouseEnter={this.onMouseEnter (visibleKey)}
                className="cell-tooltip"
              >
                <Tooltip
                  mouseLeaveDelay={0}
                  autoAdjustOverflow={false}
                  visible={this.state.cellStatus[visibleKey] || false}
                  placement="topLeft"
                  title={text}
                >
                  {text}
                </Tooltip>
              </div>
            );
          }
        }

        
        return text;
      }


      return {
        className: 'cell',
        ...item,
        render: (text, record, index)=>{
          let _render  = item.render || defaultRender;
          let formatText = format(text, item.type)
          return _render(formatText, record, index, text, currentPageData)
        }
      };
    });
  }

  checkIsOnePage(){
    let isOnePage = true;
    const { pagination} = this.state;
    const {dataSource} = this.props;
    if(pagination && typeof pagination === 'object' && pagination.pageSize){
      if(dataSource.length / pagination.pageSize){
        isOnePage = false
      }
    }
    return isOnePage;
  }

  render () {
    let {currentPageData, pagination, dataSource} = this.state;
    
    this._num = 0;
    let isOnePage = this.checkIsOnePage()
    const columns = this.handleColumns (this.props.columns, isOnePage ? dataSource: currentPageData);
    
    dataSource = this.handleData (dataSource);
    return (
      <div className="easy-table">
        <Table
          {...this.props}
          ref={c => {
            this.Table = c;
            this.updateCurrentPageData ();
          }}
          onRow={record=>{
            const {expandedRowKeys} = this.state;
            let parentRowProps = {}
            let rowProps = {};
            const {onRow, supportLevel} = this.props;
            if(onRow){
              parentRowProps = onRow(record);
            }
            if(record.levelId && supportLevel){
              rowProps.style = {
                display: expandedRowKeys.indexOf(record.levelId) !== -1 ? '' : 'none'
              }
            }
            return {
              ...rowProps,
              ...parentRowProps
            }
          }}
          pagination={pagination}
          onChange={this.handleChange}
          columns={columns}
          dataSource={dataSource}
        />
      </div>
    );
  }
}
