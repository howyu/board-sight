import { calculateControlMap } from '../model/ChessControl'
import { createInitialBoard, pieceGlyph } from '../model/ChessPosition'
import { ChessPiece, ControlCell } from '../model/ChessTypes'

@Entry
@Component
struct Index {
  @State showControl: boolean = true
  @State flipped: boolean = false

  private board: (ChessPiece | null)[][] = createInitialBoard()
  private controlMap: ControlCell[][] = calculateControlMap(this.board)
  private indexes: number[] = [0, 1, 2, 3, 4, 5, 6, 7]

  private actualRow(displayRow: number): number {
    return this.flipped ? 7 - displayRow : displayRow
  }

  private actualCol(displayCol: number): number {
    return this.flipped ? 7 - displayCol : displayCol
  }

  private squareColor(displayRow: number, displayCol: number): string {
    return (displayRow + displayCol) % 2 === 0 ? '#E8DCC7' : '#8B6F47'
  }

  private controlColor(cell: ControlCell): string {
    if (!this.showControl || cell.white === cell.black) {
      return '#00000000'
    }
    return cell.white > cell.black ? '#334A90E2' : '#33D15B5B'
  }

  build() {
    Column({ space: 16 }) {
      Column({ space: 4 }) {
        Text('BoardSight · 棋势')
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
        Text('See the board. Understand the pressure.')
          .fontSize(14)
          .fontColor('#7A7A7A')
      }
      .width('100%')
      .alignItems(HorizontalAlign.Start)

      Column() {
        ForEach(this.indexes, (displayRow: number) => {
          Row() {
            ForEach(this.indexes, (displayCol: number) => {
              Stack() {
                Blank()
                  .width('100%')
                  .height('100%')
                  .backgroundColor(this.squareColor(displayRow, displayCol))

                Blank()
                  .width('100%')
                  .height('100%')
                  .backgroundColor(
                    this.controlColor(
                      this.controlMap[this.actualRow(displayRow)][this.actualCol(displayCol)]
                    )
                  )

                Text(
                  pieceGlyph(
                    this.board[this.actualRow(displayRow)][this.actualCol(displayCol)]
                  )
                )
                  .fontSize(32)
                  .fontColor('#1D1D1F')

                if (this.showControl) {
                  Text(
                    `${this.controlMap[this.actualRow(displayRow)][this.actualCol(displayCol)].white}·${this.controlMap[this.actualRow(displayRow)][this.actualCol(displayCol)].black}`
                  )
                    .fontSize(9)
                    .fontColor('#F5F5F5')
                    .align(Alignment.BottomEnd)
                    .padding({ right: 3, bottom: 2 })
                }
              }
              .layoutWeight(1)
              .aspectRatio(1)
            })
          }
          .width('100%')
        })
      }
      .width('100%')
      .border({ width: 2, color: '#242424' })

      Row({ space: 10 }) {
        Button(this.showControl ? '隐藏势力图' : '显示势力图')
          .onClick(() => {
            this.showControl = !this.showControl
          })

        Button('翻转棋盘')
          .onClick(() => {
            this.flipped = !this.flipped
          })
      }

      Text('蓝色：白方控制更强 · 红色：黑方控制更强 · 数字：白方·黑方控制次数')
        .fontSize(12)
        .fontColor('#6A6A6A')
        .width('100%')

      Text('HarmonyOS 原生 MVP：当前先验证棋盘、控制图语义与 ArkUI 交互。后续接训练题、合法走子与 Web 共享数据。')
        .fontSize(13)
        .fontColor('#4A4A4A')
        .width('100%')
    }
    .width('100%')
    .height('100%')
    .padding(20)
    .backgroundColor('#F7F5F0')
  }
}
