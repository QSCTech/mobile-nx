import type { Grade } from '@/models/Grade'

import { ZjuamService } from '@/interop/zjuam'
import { parseCourseSelectionId } from '@/utils/stringUtils'

interface RawGrade {
  /** 成绩，如'93' */
  cj: string
  /** 绩点，如'4.0' */
  jd: string
  /** 课程名称，如'高等数学' */
  kcmc: string
  /** 学分，如'3.0' */
  xf: string
  /** 选课号，如'(2023-2024-2)-031E0011-0017170-2' */
  xkkh: string
}

export class GradeSpider {
  private zjuamService = new ZjuamService(
    { service: 'http://zdbk.zju.edu.cn/jwglxt/xtgl/login_ssologin.html' },
    60 * 30,
  )
  public constructor() {}

  /**一次性获取全部成绩信息。 */
  public async getAllGrades() {
    const items = await this.fetchGrades()
    return items.map((item) => this.processGrade(item))
  }

  // 从浙江大学教务系统获取成绩数据
  private async fetchGrades() {
    const params = new URLSearchParams({ 'queryModel.showCount': '5000' })
    //TODO username转学号
    const response = await this.zjuamService.nxFetch.postUrlEncoded(
      `http://zdbk.zju.edu.cn/jwglxt/cxdy/xscjcx_cxXscjIndex.html?doType=query&gnmkdm=N508301`,
      { body: params },
    )
    const data = (await response.json()) as { items: RawGrade[] }
    return data.items
  }

  // 处理单个成绩数据
  private processGrade(rawGrade: RawGrade): Grade {
    const { yearStart, term } = parseCourseSelectionId(rawGrade.xkkh)
    return {
      course: {
        semester: {
          year: yearStart,
          term,
        },
        id: rawGrade.xkkh,
        name: rawGrade.kcmc,
        credit: Number(rawGrade.xf),
      },
      rawScore: rawGrade.cj,
      rawGradePoint: rawGrade.jd,
      isAborted: rawGrade.cj === '弃修',
    }
  }
}
