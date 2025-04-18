import xml.etree.ElementTree as ET
import pandas as pd

def xlsx_to_dataframe(xlsx_file_path):
    df = pd.read_excel(xlsx_file_path, header=[0, 1], index_col=0)
    return df

def xml_to_dataframe(xml_file_path):
    try:
        tree = ET.parse(xml_file_path)
        root = tree.getroot()
    except ET.ParseError as e:
        with open(xml_file_path, 'r', encoding='utf-8') as f:
            print("⚠️ XML 원문 일부:\n", f.read()[:1000])
        raise ValueError(f"XML 파싱 오류: {e}")

    rows = []
    max_example_count = 0

    for 항목 in root.findall("어휘항목"):
        base = {
            "식별자": 항목.get("식별자"),
        }

        # 기본 태그
        기본태그 = ["문헌명", "항목", "음가", "속성", "어의", "어의보충"]
        for tag in 기본태그:
            text = 항목.findtext(tag)
            base[tag] = text.strip() if text else ""

        # 번역용례
        예목록 = []
        for 예 in 항목.findall("./번역용례/용례"):
            예목록.append({
                "용례 식별자": 예.get("식별자", ""),
                "출전정보": (예.findtext("출전정보") or "").strip(),
                "원문": (예.findtext("원문") or "").strip(),
                "번역문": (예.findtext("번역문") or "").strip()
            })
        base["번역용례"] = 예목록
        max_example_count = max(max_example_count, len(예목록))

        # 참조사전
        참조사전들 = [el.text.strip() for el in 항목.findall("./참조사전/사전") if el.text]
        base["참조사전"] = "; ".join(참조사전들)

        rows.append(base)

    # DataFrame 구성
    df_rows = []
    for item in rows:
        row = {
            ("기본", "식별자"): item["식별자"]
        }
        for tag in 기본태그:
            row[("기본", tag)] = item[tag]

        # 번역용례 반복
        for i in range(1, max_example_count + 1):
            if i <= len(item["번역용례"]):
                ex = item["번역용례"][i - 1]
                row[(f"번역용례{i}", "용례 식별자")] = ex["용례 식별자"]
                row[(f"번역용례{i}", "출전정보")] = ex["출전정보"]
                row[(f"번역용례{i}", "원문")] = ex["원문"]
                row[(f"번역용례{i}", "번역문")] = ex["번역문"]
            else:
                for subtag in ["용례 식별자", "출전정보", "원문", "번역문"]:
                    row[(f"번역용례{i}", subtag)] = pd.NA

        row[("참조사전", "사전")] = item["참조사전"]
        df_rows.append(row)

    df = pd.DataFrame(df_rows)
    df.columns = pd.MultiIndex.from_tuples(df.columns)
    return df


def dataframe_to_xml(df):
    root = ET.Element("어휘")
    기본태그 = ["문헌명", "항목", "음가", "속성", "어의"]  # "어의보충" 제거

    # 최대 번역용례 인덱스 추정
    max_idx = max(
        int(col[0].replace("번역용례", ""))
        for col in df.columns
        if col[0].startswith("번역용례") and col[1] == "용례 식별자"
    )

    # NaN 값을 빈 문자열로 대체하는 함수
    def safe_get(row, col):
        value = row.get(col)
        return value if pd.notna(value) else ""

    for _, row in df.iterrows():
        항목 = ET.SubElement(root, "어휘항목", {"식별자": safe_get(row, ("기본", "식별자"))})

        for tag in 기본태그:
            el = ET.SubElement(항목, tag)
            el.text = safe_get(row, ("기본", tag))

        # "어의보충" 태그 처리 (값이 비어 있지 않으면 추가)
        어의보충 = safe_get(row, ("기본", "어의보충"))
        if 어의보충:  # 비어 있지 않다면
            el = ET.SubElement(항목, "어의보충")
            el.text = 어의보충

        번역용례 = ET.SubElement(항목, "번역용례")
        for i in range(1, max_idx + 1):
            식별자 = safe_get(row, (f"번역용례{i}", "용례 식별자"))
            if not 식별자:
                continue

            예 = ET.SubElement(번역용례, "용례", {"식별자": 식별자})
            for subtag in ["출전정보", "원문", "번역문"]:
                subel = ET.SubElement(예, subtag)
                subel.text = safe_get(row, (f"번역용례{i}", subtag))

        참조사전 = ET.SubElement(항목, "참조사전")
        for 사전 in (safe_get(row, ("참조사전", "사전"))).split("; "):
            사전 = 사전.strip()
            if 사전:
                el = ET.SubElement(참조사전, "사전")
                el.text = 사전

    return ET.tostring(root, encoding="utf-8").decode("utf-8")


# ──────────────────────────────────────────────
if __name__ == "__main__":
    # 파일 경로 (xlsx 또는 xml)
    file_path = "C:/Users/kaien/Downloads/REPOSITORY/private725/LX2024/tools/어휘속성작업물(논어주소1).xml"  # 또는 .xml 경로

    # 파일 확장자 확인
    if file_path.endswith(".xml"):
        # XML → DataFrame
        df = xml_to_dataframe(file_path)
        print("✅ MultiIndex DataFrame 생성 완료")
    elif file_path.endswith(".xlsx"):
        # Excel → DataFrame
        df = xlsx_to_dataframe(file_path)
        print("✅ MultiIndex DataFrame 생성 완료")
    else:
        raise ValueError("지원되지 않는 파일 형식입니다. XML 또는 XLSX 파일만 지원됩니다.")

    # DataFrame → Excel 저장 (엑셀 파일 경로 자동 생성)
    xlsx_path = file_path.replace(".xml", ".xlsx").replace(".xlsx", "_converted.xlsx")
    
    # 인덱스를 1부터 시작하도록 설정
    df.index = range(1, len(df) + 1)
    
    with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
        df.to_excel(writer, startrow=0, index=True)  # index=True로 설정하여 인덱스 포함
    print(f"✅ Excel 저장 완료: {xlsx_path}")

    # DataFrame → XML 복원 및 저장
    xml_output = dataframe_to_xml(df)
    xml_output_path = file_path.replace(".xml", "_복원.xml").replace(".xlsx", "_복원.xml")
    with open(xml_output_path, "w", encoding="utf-8") as f:
        f.write(xml_output)
    print(f"✅ XML 복원 저장 완료: {xml_output_path}")
