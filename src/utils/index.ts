/**utils初始化文件，主要用于加载扩展原型方法 */

import './polyfill'
import './extendArray'
import './extendHeaders'
import './extendMap'
import './extendString'

import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import isoWeek from 'dayjs/plugin/isoWeek'
dayjs.extend(duration)
dayjs.extend(isoWeek)
