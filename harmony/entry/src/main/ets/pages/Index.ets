import { calculateControlMap, controlledSquares } from '../model/ChessControl'
import { createInitialBoard, pieceGlyph } from '../model/ChessPosition'
import { ChessPiece, ControlCell, Position } from '../model/ChessTypes'

@Entry
@Component
struct Index {
  @State showControl: boolean = true
  @State flipped: boolean = false
  @State selectedRow: number = -1
  @State selectedCol: number = -1

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

  private isSelectedSquare(row: number, col: number): boolean {
    return this.selectedRow === row && this.selectedCol === col
  }

  private isSelectedControl(row: number, col: number): boolean {
    if (this.selectedRow < 0 || this.selectedCol < 0) {
      return false
    }
    const selected: ChessPiece | null = this.board[this.selectedRow][this.selectedCol]
    if (selected === null) {
      return false
    }

    return controlledSquares(
      this.board,
      this.selectedRow,
      this.selectedCol,
      selected
    ).some((position: Position) => position.row === row && position.col === col)
  }

  private selectSquare(row: number, col: number): void {
    const value: ChessPiece | null = this.board[row][col]
    if (value === null) {
      this.selectedRow = -1
      this.selectedCol = -1
      return
    }

    if (this.isSelectedSquare(row, col)) {
      this.selectedRow = -1
      this.selectedCol = -1
      return
    }

    this.selectedRow = row
    this.selectedCol = col
  }

  private selectedLabel(): string {
    if (this.selectedRow < 0 || this.selectedCol < 0) {
      return '点击任意棋子，查看它单独控制的格子'
    }
    const selected: ChessPiece | null = this.board[this.selectedRow][this.selectedCol]
    if (selected === null) {
      return '点击任意棋子，查看它单独控制的格子'
    }
    const files: string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const square: string = `${files[this.selectedCol]}${8 - this.selectedRow}`
    return `已选中 ${square} · ${selected.color} ${selected.type}`
  }

  build() {
    Scroll() {
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

        Text(this.selectedLabel())
          .fontSize(13)
          .fontColor(this.selectedRow >= 0 ? '#7A5A00' : '#6A6A6A')
          .width('100%')

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

                  if (this.isSelectedControl(
                    this.actualRow(displayRow),
                    this.actualCol(displayCol)
                  )) {
                    Blank()
                      .width('82%')
                      .height('82%')
                      .borderRadius(999)
                      .backgroundColor('#99FFD54F')
                  }

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
                      .fontSize(12)
                      .fontColor('#FFFFFF')
                      .backgroundColor('#B31D1D1F')
                      .align(Alignment.BottomEnd)
                      .padding({ right: 3, bottom: 2 })
                  }

                  if (this.isSelectedSquare(
                    this.actualRow(displayRow),
                    this.actualCol(displayCol)
                  )) {
                    Blank()
                      .width('100%')
                      .height('100%')
                      .border({ width: 3, color: '#FFD54F' })
                  }
                }
                .layoutWeight(1)
                .aspectRatio(1)
                .onClick(() => {
                  this.selectSquare(
                    this.actualRow(displayRow),
                    this.actualCol(displayCol)
                  )
                })
              })
            }
            .width('100%')
          })
        }
        .width('100%')
        .border({ width: 2, color: '#242424' })

        Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Center }) {
          Button(this.showControl ? '隐藏势力图' : '显示势力图')
            .onClick(() => {
              this.showControl = !this.showControl
            })

          Button('翻转棋盘')
            .onClick(() => {
              this.flipped = !this.flipped
            })

          if (this.selectedRow >= 0) {
            Button('取消选中')
              .onClick(() => {
                this.selectedRow = -1
                this.selectedCol = -1
              })
          }
        }

        Text('蓝色：白方控制更强 · 红色：黑方控制更强 · 黄色：当前棋子的控制范围')
          .fontSize(12)
          .fontColor('#6A6A6A')
          .width('100%')

        Text('数字为白方·黑方控制次数。控制范围表示攻击/防守影响，不等同于考虑王安全后的合法走子。')
          .fontSize(12)
          .fontColor('#6A6A6A')
          .width('100%')
      }
      .width('100%')
      .constraintSize({ maxWidth: 560 })
      .padding(20)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F7F5F0')
  }
}
