import { Course } from '../models/Course'
import { ZjuamService } from '../interop/zjuam'

export interface XzzdTodo {
  /**选课号 */
  courseCode: Course['id']
  /**学在浙大系统内部数字id，目前无用 */
  courseId: number
  endAt: Date
  /**todo标题，不含课程名，如'第一讲作业' */
  title: string
  type: TodoType
}
export type TodoType = 'homework' | 'exam' | 'questionnaire'

export class XzzdSpider {
  zjuamService = new ZjuamService(
    {
      follow() {
        //TODO ts似乎为可选参数；某些zhCN或许也可以不传
        return `
https://identity.zju.edu.cn/auth/realms/zju/protocol/cas/login?ui_locales=zh-CN&service=https%3A//courses.zju.edu.cn/user/index&locale=zh_CN&ts=${(Date.now() / 1000).toFixed(0)}`
      },
    },
    60 * 10,
  )

  /**
   * 学在浙大日程获取。
   * 只能获取未提交且未截止的作业。
   */
  async getTodos(): Promise<XzzdTodo[]> {
    const response = await this.zjuamService.nxFetch.get(
      'https://courses.zju.edu.cn/api/todos',
    )
    const { todo_list } = (await response.json()) as {
      todo_list: {
        course_code: string
        course_id: number
        course_name: string
        course_type: number
        end_time: string //示例：'2025-04-09T16:00:00Z'
        id: number
        is_locked: boolean
        is_student: boolean
        prerequisites: string[]
        title: string
        type: TodoType
      }[]
    }
    return todo_list.map((v) => ({
      courseCode: v.course_code,
      courseId: v.course_id,
      endAt: new Date(v.end_time),
      title: v.title,
      type: v.type,
    })) as XzzdTodo[]
  }
}
